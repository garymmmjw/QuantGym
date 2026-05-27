# QuantGuide Question

## 1095. Better In Red IV

**Metadata**

- ID: `llQ874551JX4Noap4q7Y`
- URL: https://www.quantguide.io/questions/better-in-red-iv
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG, Jane Street, Citadel, Hudson River Trading
- Source: sig
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-10-29 22:15:41 America/New_York
- Last Edited By: Gabe

### 题干

The surfaces of a $3 \times 3 \times 3$ cube (initially white) are painted red and then is cut up into $27$ $1 \times 1 \times 1$ small cubes. One of the cubes is selected uniformly at random and is rolled. The face appearing is red. What is the probability the cube selected was a corner cube?

### Hint

We are conditioning our sample space to the cubes with at least one red side. How many total red sides are there?

### 解答

We are conditioning our sample space to the cubes with at least one red side. There are $54$ total sides that are red on the cube, as each face of the larger cube has area $9$. There are $8$ corner cubes that each have $3$ red painted faces. These contribute $24$ of the $54$ total red faces. Therefore, the answer is just $\dfrac{24}{54} = \dfrac{4}{9}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4/9"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "llQ874551JX4Noap4q7Y",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-29 22:15:41 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8957659,
    "source": "sig",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Better In Red IV",
    "topic": "probability",
    "urlEnding": "better-in-red-iv",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "medium",
    "id": "llQ874551JX4Noap4q7Y",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Better In Red IV",
    "topic": "probability",
    "urlEnding": "better-in-red-iv"
  }
}
```
