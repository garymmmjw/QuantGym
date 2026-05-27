# QuantGuide Question

## 383. Jellybean Jar I

**Metadata**

- ID: `aF52yKzAY713qyDsxHO6`
- URL: https://www.quantguide.io/questions/jellybean-jar-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Old Mission
- Source: OMC OA
- Tags: Combinatorics, Events
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 23:44:30 America/New_York
- Last Edited By: Gabe

### 题干

A pack contains $6$ red and $10$ blue jellybeans. A child wants to eat $4$ jellybeans and grabs into the pack to select $4$ jellybeans one-by-one uniformly at random without replacement. Find the probability that the first two jellybeans are red and the last two are blue.

### Hint

To get two red jellybeans at the start, the child has $6 \cdot 5 = 30$ options of red jellybean. How many options do they have for the blue jellybeans?

### 解答

To get two red jellybeans at the start, the child has $6 \cdot 5 = 30$ options of red jellybean. Then, for the two blues, the child has $10 \cdot 9 = 90$ options. Thus, there are $2700$ ways for the child to obtain this sequence. The total number of ways to draw $4$ jellybeans without replacement is $16 \cdot 15 \cdot 14 \cdot 13$. Therefore, our probability is $\dfrac{2700}{16 \cdot 15 \cdot 14 \cdot 13} = \dfrac{45}{728}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "45/728"
    ],
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "aF52yKzAY713qyDsxHO6",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 23:44:30 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2964229,
    "randomizable": "",
    "source": "OMC OA",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Jellybean Jar I",
    "topic": "probability",
    "urlEnding": "jellybean-jar-i"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "id": "aF52yKzAY713qyDsxHO6",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Jellybean Jar I",
    "topic": "probability",
    "urlEnding": "jellybean-jar-i"
  }
}
```
