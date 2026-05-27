# QuantGuide Question

## 255. Geometrical Progression

**Metadata**

- ID: `v6fKNumd4Dncap6b8i55`
- URL: https://www.quantguide.io/questions/geometrical-progression
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: Puzzles_and_Curious_Problems
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-10-29 12:13:59 America/New_York
- Last Edited By: Gabe

### 题干

Write out a series of whole numbers in geometrical progression with at least $3$ terms, starting from $1$, so that the numbers add up to a square. The common ratio must be strictly larger than $1$.

$$\\$$

For example, an example of a geometrical progression (not the correct one):

$$2^0 + 2^1 + 2^2 + 2^3 + 2^4 + 2^5 = 1 + 2 + 4 + 8 + 16 + 32 = 63$$

Give the answer in the form of the smallest square number in which a progression can be written. 


### Hint

$$n = 1$ is a trivial answer. Guess and check for different values of $n$. The correct $n$ is $n < 10$. 

### 解答

We can guess and check starting from $n = 2$. Above, we showed that $n=2$ gives one underneath a square. We can iterate this process checking numbers up until a certain point. 

$121 = 3^0 + 3^1 + 3^2 + 3^3 + 3^4 = 11^2$

A fact: there are only two square numbers which are sum of consecutive powers of an integers. These are $121$ and $400$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "121"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "v6fKNumd4Dncap6b8i55",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-29 12:13:59 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1993942,
    "source": "Puzzles_and_Curious_Problems",
    "status": "published",
    "tags": [],
    "title": "Geometrical Progression",
    "topic": "brainteasers",
    "urlEnding": "geometrical-progression",
    "version": 4
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "v6fKNumd4Dncap6b8i55",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Geometrical Progression",
    "topic": "brainteasers",
    "urlEnding": "geometrical-progression"
  }
}
```
