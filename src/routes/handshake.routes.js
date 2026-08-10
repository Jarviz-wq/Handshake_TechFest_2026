const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const prisma = require('../db/client'); 
const authenticate = require('../middleware/authenticate');

// GET /api/handshakes (Fetch active/recent handshakes list)
router.get('/', authenticate, async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const handshakes = await prisma.handshake.findMany({
      where: {
        OR: [
          { initiatorId: currentUserId },
          { responderId: currentUserId }
        ]
      },
      include: {
        initiator: {
          select: { id: true, fullName: true, username: true, department: true }
        },
        responder: {
          select: { id: true, fullName: true, username: true, department: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const recent = handshakes.map(h => {
      const otherUser = h.initiator.id === currentUserId ? h.responder : h.initiator;
      return {
        id: h.id,
        full_name: otherUser.fullName,
        username: otherUser.username,
        department: otherUser.department || 'Attendee',
        when: new Date(h.createdAt).toLocaleDateString()
      };
    });

    return res.json({
      success: true,
      data: {
        pending: [],
        recent: recent
      }
    });
  } catch (err) {
    console.error('Error fetching handshakes:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch handshakes.' });
  }
});

// POST /api/handshakes/generate-code (Strict 45s OTP window lock)
router.post('/generate-code', authenticate, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const now = new Date();

    let activeCode = await prisma.handshakeCode.findFirst({
      where: {
        ownerId: currentUserId,
        usedAt: null,
        expiresAt: { gt: now }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (activeCode) {
      return res.json({
        success: true,
        message: 'Retrieved active handshake code.',
        data: { code: activeCode.code }
      });
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let randomPart = '';
    const randomBytes = crypto.randomBytes(4);
    for (let i = 0; i < 4; i++) {
      randomPart += chars[randomBytes[i] % chars.length];
    }
    
    const code = `HS-${randomPart}`;
    const expiresAt = new Date(Date.now() + 45 * 1000);

    activeCode = await prisma.handshakeCode.create({
      data: {
        code: code,
        ownerId: currentUserId,
        expiresAt: expiresAt
      }
    });

    return res.json({
      success: true,
      message: 'Handshake code generated successfully.',
      data: { code: activeCode.code }
    });
  } catch (err) {
    console.error('Error generating handshake code:', err);
    return res.status(500).json({ success: false, message: 'Server error generating code.' });
  }
});

// POST /api/handshakes/connect
router.post('/connect', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    const currentUserId = req.user.id;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Handshake code is required.' });
    }

    const cleanCode = code ? code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
    const formattedCode = `HS-${cleanCode.replace(/^HS/, '')}`;

    const hsCode = await prisma.handshakeCode.findFirst({
      where: { 
        code: formattedCode,
        usedAt: null 
      },
      include: { owner: true }
    });

    if (!hsCode) {
      return res.status(404).json({ success: false, message: 'Invalid or already used code.' });
    }

    if (new Date() > new Date(hsCode.expiresAt)) {
      return res.status(400).json({ success: false, message: 'This code has expired.' });
    }

    const targetUser = hsCode.owner;

    if (targetUser.id === currentUserId) {
      return res.status(400).json({ success: false, message: 'You cannot connect with yourself.' });
    }

    const [userLowId, userHighId] = [currentUserId, targetUser.id].sort();

    try {
      await prisma.$transaction(async (tx) => {
        await tx.handshake.create({
          data: {
            initiatorId: targetUser.id, 
            responderId: currentUserId,
            userLowId: userLowId,
            userHighId: userHighId,
            codeId: hsCode.id
          }
        });

        await tx.handshakeCode.update({
          where: { id: hsCode.id },
          data: { usedAt: new Date() }
        });

        await tx.user.update({
          where: { id: currentUserId },
          data: { 
            handshakeCount: { increment: 1 },
            lastVerifiedHandshakeAt: new Date()
          }
        });
        
        await tx.user.update({
          where: { id: targetUser.id },
          data: { 
            handshakeCount: { increment: 1 },
            lastVerifiedHandshakeAt: new Date()
          }
        });
      });
    } catch (connectError) {
      if (connectError.code === 'P2002') {
        return res.status(400).json({ success: false, message: 'You are already connected with this user.' });
      }
      throw connectError;
    }

    return res.json({
      success: true,
      message: 'Handshake connected successfully!',
      data: {
        id: targetUser.id,
        full_name: targetUser.fullName,
        username: targetUser.username
      }
    });

  } catch (err) {
    console.error('Error connecting handshake:', err);
    return res.status(500).json({ success: false, message: 'Server error while establishing connection.' });
  }
});

module.exports = router;
