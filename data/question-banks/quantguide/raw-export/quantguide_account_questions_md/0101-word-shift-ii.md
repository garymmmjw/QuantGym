# QuantGuide Question

## 101. Word Shift II

**Metadata**

- ID: `XlGnWwyIYVFLRwAd2Tb1`
- URL: https://www.quantguide.io/questions/word-shift-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Old Mission
- Source: prob hw
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-1 09:23:30 America/New_York
- Last Edited By: Gabe

### 题干

Find the number of anagrams of $BOOLAHUBBOO$ that have at least $2$ $B$'s before the first $O$.

### Hint

There are $3$ $B$ and $4$ $O$ in the word above. There are $\displaystyle \binom{11}{7}$ ways to pick the locations of these $7$ letters in our anagram. How many anagrams of $BBBOOOO$ have at least $2$ $B$'s before the first $O$?

### 解答

There are $3$ $B$ and $4$ $O$ in the word above. There are $\displaystyle \binom{11}{7}$ ways to pick the locations of these $7$ letters in our anagram. However, there are $5$ anagrams of $BBBOOOO$ that have at least $2$ of the $B$'s before all of the $O$'s. Namely, you can move one $B$ around among the $4$ $O$'s, yielding $5$ total letters to place. You just select one of those spots to be $B$ and those yield the $5$ anagrams. Afterwards, the other $4$ letters $LAHU$ can be arranged in the remaining $4$ blanks completely at will in $4!$ ways. Therefore, the answer is $$5 \cdot 4! \cdot \displaystyle \binom{11}{7} =5 \cdot \dfrac{11!}{7!} = 39600$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "39600"
    ],
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "XlGnWwyIYVFLRwAd2Tb1",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-1 09:23:30 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 721161,
    "source": "prob hw",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Word Shift II",
    "topic": "probability",
    "urlEnding": "word-shift-ii",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "medium",
    "id": "XlGnWwyIYVFLRwAd2Tb1",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Word Shift II",
    "topic": "probability",
    "urlEnding": "word-shift-ii"
  }
}
```
