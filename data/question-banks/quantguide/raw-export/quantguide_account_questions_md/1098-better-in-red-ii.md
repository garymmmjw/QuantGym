# QuantGuide Question

## 1098. Better in Red II

**Metadata**

- ID: `sJb9nlp5lqWGBJLfgcTH`
- URL: https://www.quantguide.io/questions/better-in-red-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG, Jane Street, Hudson River Trading, Five Rings
- Source: N/A
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: 5
- Last Edited: 2023-11-5 10:08:08 America/New_York
- Last Edited By: Gabe

### 题干

A $10\times 20\times 30$ rectangular prism is painted red on the surface and then cut into $6000$ $1 \times 1 \times 1$ cubes and one is selected uniformly at random. Find the expected number of red faces on this cube.

### Hint

Label the faces of each cube $1-6$, and then let $I_i$ be the indicator that side $i$ of the cube that is drawn is colored red. Then $T = I_1 + \dots + I_6$ gives the total number of red sides of the cube.

### 解答

Label the faces of each cube $1-6$, and then let $I_i$ be the indicator that side $i$ of the cube that is drawn is colored red. Then $T = I_1 + \dots + I_6$ gives the total number of red sides of the cube. We need to be careful here, as the indicators are not exchangeable. Instead, two of the indicators will correspond to a $10 \times 20$ side, two to a $20 \times 30$ side, and two to a $10 \times 30$ side. Therefore, there are 3 subsets of indicators that are exchangeable, so we can reduce it to an expectation involving 3 indicators and multiply it by 2, so $\mathbb{E}[T] = 2(\mathbb{E}[I_1] + \mathbb{E}[I_2] + \mathbb{E}[I_3])$, where we take $I_1$ to indicate a $10 \times 20$ side, $I_2$ to indicate a $20 \times 30$ side, and $I_3$ to indicate a $10 \times 30$ side. $$$$Then, to evaluate these expectations, we just need to find the probability that the side indicated is red on our cube. For $I_1$, that is $10 \cdot 20 = 200$ cubes. For $I_2$, that is $20 \cdot 30 = 600$ cubes. For $I_3$, that is $10 \cdot 30 = 300$ cubes. All of these need to be divided by $6000$ as that is the volume of the entire prism. Therefore, $\mathbb{E}[T] = \dfrac{2(200 + 300 + 600)}{6000} = \dfrac{11}{30}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "11/30"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "sJb9nlp5lqWGBJLfgcTH",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:08:08 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8980171,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Better in Red II",
    "topic": "probability",
    "urlEnding": "better-in-red-ii",
    "version": 5
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
        "company": "Hudson River Trading"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "id": "sJb9nlp5lqWGBJLfgcTH",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Better in Red II",
    "topic": "probability",
    "urlEnding": "better-in-red-ii"
  }
}
```
