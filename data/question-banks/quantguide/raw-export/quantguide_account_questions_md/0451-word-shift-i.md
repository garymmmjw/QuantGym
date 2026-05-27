# QuantGuide Question

## 451. Word Shift I

**Metadata**

- ID: `JY0Y4bw6TNZisB1WjfaA`
- URL: https://www.quantguide.io/questions/word-shift-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Old Mission
- Source: prob hw
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-1 09:23:43 America/New_York
- Last Edited By: Gabe

### 题干

Find the number of anagrams of $BOOLAHUBBOO$ that have all of the $B$'s before the first $O$.

### Hint

There are $3$ $B$ and $4$ $O$ in the word above. There are $\displaystyle \binom{11}{7}$ ways to pick the locations of these $7$ letters in our anagram.

### 解答

There are $3$ $B$ and $4$ $O$ in the word above. There are $\displaystyle \binom{11}{7}$ ways to pick the locations of these $7$ letters in our anagram. However, there is only one anagram of $BBBOOOO$ that has all of the $B$'s before all of the $O$'s. Namely, it is the one listed there. Afterwards, the other $4$ letters $LAHU$ can be arranged in the remaining $4$ blanks completely at will in $4!$ ways. Therefore, the answer is $$4! \cdot \displaystyle \binom{11}{7} = \dfrac{11!}{7!} = 7920$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7920"
    ],
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "JY0Y4bw6TNZisB1WjfaA",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-1 09:23:43 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3585355,
    "source": "prob hw",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Word Shift I",
    "topic": "probability",
    "urlEnding": "word-shift-i",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "medium",
    "id": "JY0Y4bw6TNZisB1WjfaA",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Word Shift I",
    "topic": "probability",
    "urlEnding": "word-shift-i"
  }
}
```
