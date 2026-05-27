# QuantGuide Question

## 231. Card Shuffling

**Metadata**

- ID: `LlwSRMuQbZUj5k7n72KQ`
- URL: https://www.quantguide.io/questions/card-shuffling
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: puzzles and curious problems
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-11 10:50:38 America/New_York
- Last Edited By: Gabe

### 题干

The rudimentary method of shuffling a pack of cards is to take the pack face downwards in the left hand and then transfer them one by one to the right hand, putting the second on top of the first, the third under, the fourth above, and so on until all are transferred.

$$\\$$

If you do this with any even number of cards and keep on repeating the shuffle in the same way, the cards will in due time return to their original order. Try with $4$ cards, you will find the order is restored in $3$ shuffles. In face, where the number of cards is $2, 4, 8, 16, 32, 64$, the number of shuffles to get them back to the original arrangement is $2, 3, 4, 5, 6, 7$ respectively.

$$\\$$

How many shuffles are necessary in the case of $14$ cards? 

### Hint

Each shuffle can be represented as a permutation. 

### 解答

Each shuffle can be represented as a permutation in $S_{14}$, the symmetric group on $14$ integers. This is because each of the cards is now permuted to some other spot in the deck, meaning that the shuffle operation can be represented as a permutation of $14$ numbers

In two-row notation, this can be written as: 

$$\begin {pmatrix}
1 & 2 & 3 & 4 & 5 & 6 & 7 & 8 & 9 & 10 & 11 & 12 & 13 & 14 \\ 14 & 12 & 10 & 8 & 6 & 4 & 2 & 1 & 3 & 5 & 7 & 9 & 11 & 13 \end {pmatrix}$$

which, when expressed in cycle notation, would be:

$$\begin {pmatrix} 1 & 14 & 13 & 11 & 7 & 2 & 12 & 9 & 3 & 10 & 5 & 6 & 4 & 8 \end{pmatrix}$$

This cycle is a disjoint one, as nothing maps back before the end. Thus, this permutation has order $14$. This means $14$ shuffles are required to get the cards back to their original arrangement. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "14"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "LlwSRMuQbZUj5k7n72KQ",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-11 10:50:38 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1830704,
    "source": "puzzles and curious problems",
    "status": "published",
    "tags": [],
    "title": "Card Shuffling",
    "topic": "brainteasers",
    "urlEnding": "card-shuffling",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "LlwSRMuQbZUj5k7n72KQ",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Card Shuffling",
    "topic": "brainteasers",
    "urlEnding": "card-shuffling"
  }
}
```
