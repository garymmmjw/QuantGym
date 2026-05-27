# QuantGuide Question

## 1087. Mississippi

**Metadata**

- ID: `kpNakWlXycTocQMlXJsS`
- URL: https://www.quantguide.io/questions/mississippi
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Old Mission
- Source: OMC OA
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:31:04 America/New_York
- Last Edited By: Gabe

### 题干

How many permutations of the word MISSISSIPPI are palindromes? A palindrome means that the string creates reads the same both forwards and backwards.

### Hint

For the word to read the same both forwards and backwards, as Mississippi is $11$ letters, the $M$ must be in the middle. Therefore, we have something in the form $-----M-----$, where each $-$ is filled with an $S,I,$ or $P$.

### 解答

For the word to read the same both forwards and backwards, as Mississippi is $11$ letters, the $M$ must be in the middle. Therefore, we have something in the form $-----M-----$, where each $-$ is filled with an $S,I,$ or $P$. Note that there are $4$ $S$s and $I$s, while there are only $2$ $P$s. Therefore, for the word to read the same both forwards and backwards, we must have $2$ $S$s and $I$s on each side and $1$ $P$ on each side. Once we distribute the letters to one side, the other side is also fixed, so the number of ways to do this is $\dfrac{5!}{2! \cdot 2! \cdot 1!} = 30$, as we must account for the overcounting induced by exchanging the duplicate $S$ and $I$ around.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "30"
    ],
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "kpNakWlXycTocQMlXJsS",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:31:04 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8881277,
    "source": "OMC OA",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Mississippi",
    "topic": "probability",
    "urlEnding": "mississippi",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "id": "kpNakWlXycTocQMlXJsS",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Mississippi",
    "topic": "probability",
    "urlEnding": "mississippi"
  }
}
```
