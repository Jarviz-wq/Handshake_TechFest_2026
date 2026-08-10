// Sorts two user ids into a stable (low, high) order so a Handshake between
// A and B and a later attempt between B and A resolve to the same pair —
// this is what makes the userLowId/userHighId unique constraint in the
// schema order-independent. Plain string comparison; ids are UUIDs, which
// compare consistently and deterministically as strings.

function sortPair(idA, idB) {
  return idA < idB ? [idA, idB] : [idB, idA];
}

module.exports = { sortPair };
