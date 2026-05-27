# QuantGuide Question

## 1047. Birds of a Feather

**Metadata**

- ID: `0m5pP01aw9A4uPS7jbPI`
- URL: https://www.quantguide.io/questions/birds-of-a-feather
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: tqd
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-1 10:31:12 America/New_York
- Last Edited By: Gabe

### 题干

Two blue and six yellow birds are flying around the sky and then land on a telephone wire in uniformly random order. Assuming no bird sits on another bird, what is the probability that the two blue birds are adjacent to each other?

### Hint

Label the spots $1-8$. There are $7$ possible starting spots for the first of the two blue birds to land (spots $1-7$).

### 解答

Label the spots $1-8$. There are $7$ possible starting spots for the first of the two blue birds to land (spots $1-7$). Then, if the first bird lands in spot $i$, the other bird should land in spot $i+1$, so the other spot is fixed after. Then, there are $2$ ways to order the two blue birds. Afterwards, there are $6!$ ways to arrange the other $6$ birds on the remaining spots. There are a total of $8!$ ways to arrange the birds, so our answer is $$\dfrac{2! \cdot 7 \cdot 6!}{8!} = \dfrac{1}{4}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/4"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "0m5pP01aw9A4uPS7jbPI",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-1 10:31:12 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8522159,
    "source": "tqd",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Birds of a Feather",
    "topic": "probability",
    "urlEnding": "birds-of-a-feather",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "0m5pP01aw9A4uPS7jbPI",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Birds of a Feather",
    "topic": "probability",
    "urlEnding": "birds-of-a-feather"
  }
}
```
