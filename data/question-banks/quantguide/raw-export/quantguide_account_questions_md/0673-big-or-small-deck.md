# QuantGuide Question

## 673. Big or Small Deck?

**Metadata**

- ID: `L4N2KCvBV00jYQruA0ga`
- URL: https://www.quantguide.io/questions/big-or-small-deck
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Citadel
- Source: og
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-2 22:48:07 America/New_York
- Last Edited By: Gabe

### 题干

A standard deck is split up into two subdecks of $39$ and $13$ cards. You and a friend may choose one of the decks to draw cards from the top of one-by-one. The goal is to minimize the expected number of cards needed to be drawn to obtain your first ace. Whoever needs to draw fewer cards to see their first ace wins the round. You get to select first. Which deck do you select? Answer $13$ if you should select the deck of $13$ to draw from, $39$ if you should select the deck of $39$ to draw from, and $-1$ if it doesn't matter. Note that if a given deck has no aces, we consider the other deck faster and that we disregard ties i.e. neither person wins.

### Hint

Think about which deck has larger probability of having no cards.

### 解答

The idea here is that the deck of size $13$ has a significantly larger probability of having no aces in it. Conditional on there being an ace in the deck of $13$, the deck of $13$ is faster on average. However, the probability of no ace is so much larger in the $13$ than it is in the $39$ that the deck of $39$ is the better selection.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "39"
    ],
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "L4N2KCvBV00jYQruA0ga",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-2 22:48:07 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5409199,
    "source": "og",
    "status": "published",
    "tags": [],
    "title": "Big or Small Deck?",
    "topic": "brainteasers",
    "urlEnding": "big-or-small-deck",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "medium",
    "id": "L4N2KCvBV00jYQruA0ga",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Big or Small Deck?",
    "topic": "brainteasers",
    "urlEnding": "big-or-small-deck"
  }
}
```
