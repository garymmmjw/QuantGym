# QuantGuide Question

## 28. Consecutive Pairs

**Metadata**

- ID: `W8bPdp4iHXr2xXwyiAeU`
- URL: https://www.quantguide.io/questions/consecutive-pairs
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: N/A
- Source: 2023 AIME I 11
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Consider the set of 10 consecutive integers $\{1, 2, \ldots, 10\}$. How many subsets contain exactly 1 pair of consecutive integers? For example, $\{3, 5, 6, 9\}$ contains exactly 1 pair of consecutive integers. 

### Hint

Suppose we have all 10 integers written out in order on paper. Our goal is to cover some of the integers with tiles such that only two tiles are side-by-side; covered integers belong in a subset of interest. Perhaps we can invent our own special tiles of different shapes that prevent some integers from being next to each other by design; then, we can simply find the number of arrangements of the tiles.

### 解答

 We can avoid a really messy casework solution by thinking about the problem creatively. Suppose we have all 10 integers written out in order on paper. Our goal is to cover some of the integers with tiles such that only two tiles are side-by-side; covered integers belong in a subset of interest. Perhaps we can invent our own special tiles of different shapes that prevent some integers from being next to each other by design; then, we can simply find the number of arrangements of the tiles. Specifically, we can have a few tiles labeled $U$ for uncovered, a few tiles labeled $UC$ for uncovered-covered, and exactly one tile labeled $UCC$ for uncovered-covered-covered (this tile ensures that exactly one pair of consecutive integers is in the subset). In order to account for all cases, however, we need to have an additional slot at 0. We have the following cases: $$$$

Case 1: There are 6 total integers in the subset. In other words, there are 4 $UC$ tiles and 1 $UCC$ tile. There are $\binom{5}{4} = 5$ ways to order these 5 tiles. $$$$

Case 2: There are 5 total integers in the subset. In other words, there are 3 $UC$ tiles, 1 $UCC$ tile, and 2 $U$ tiles. There are $\binom{6}{3, 1, 2} = 60$ ways to order these 6 tiles. $$$$

Case 3: There are 4 total integers in the subset. In other words, there are 2 $UC$ tiles, 1 $UCC$ tile, and 4 $U$ tiles. There are $\binom{7}{2, 1, 4} = 105$ ways to order these 7 tiles. $$$$

Case 4: There are 3 total integers in the subset. In other words, there is 1 $UC$ tile, 1 $UCC$ tile, and 6 $U$ tiles. There are $\binom{8}{1, 1, 6} = 56$ ways to order these 8 tiles. $$$$

Case 5: There are 2 total integers in the subset. In other words, is 1 $UCC$ tile, and 8 $U$ tiles. There are $\binom{9}{8} = 9$ ways to order these 9 tiles. $$$$

Adding it all up, we conclude there are $5 + 60 + 105 + 56 + 9 = 235$ possible subsets that contain exactly 1 pair of consecutive integers. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "235"
    ],
    "difficulty": "hard",
    "id": "W8bPdp4iHXr2xXwyiAeU",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 201033,
    "source": "2023 AIME I 11",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Consecutive Pairs",
    "topic": "probability",
    "urlEnding": "consecutive-pairs"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "W8bPdp4iHXr2xXwyiAeU",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Consecutive Pairs",
    "topic": "probability",
    "urlEnding": "consecutive-pairs"
  }
}
```
