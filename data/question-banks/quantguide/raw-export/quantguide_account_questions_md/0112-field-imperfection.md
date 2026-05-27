# QuantGuide Question

## 112. Field Imperfection

**Metadata**

- ID: `g26Xw4NiF4dA8d7qR7Nb`
- URL: https://www.quantguide.io/questions/field-imperfection
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: original
- Tags: Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:32:15 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that a field for the World Cup is being constructed. The field is intended to have dimensions of $300$ feet long by $200$ feet wide. However, due to human imperfection, the error in the length measurement is a RV $X \sim \text{Unif}(-15,15)$ and the error in the width measurement is a RV $Y \sim \text{Unif}(-5,15)$, independent of $X$. Hence, the true dimensions are $300+X$ and $200+Y$. Find the expected area of the field.

### Hint

The area then is $(300 + X)(200 + Y)$, so we want $\mathbb{E}[(300 + X)(200 + Y)]$.

### 解答

The measurement of the length is given by $300  + X$, where $X$ is the error, and the measurement of the width is given by $200 + Y$, where $Y$ is the error. The area then is $(300 + X)(200 + Y)$, so we want $\mathbb{E}[(300 + X)(200 + Y)] = \mathbb{E}[60000 + 300Y + 200X + XY]$. We have that $\mathbb{E}[X] = 0$ and $\mathbb{E}[Y] = 5$ from properties of uniform random variables. By the linearity of expectation and independence of $X$ and $Y$, the above is just $60000 + 300\mathbb{E}[Y] + 200\mathbb{E}[X] + \mathbb{E}[X]\mathbb{E}[Y]$. The last two terms vanish as $\mathbb{E}[X] = 0$. The second term is $1500$, so the expected area is $61500$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "61500"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "g26Xw4NiF4dA8d7qR7Nb",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:32:15 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 788076,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Field Imperfection",
    "topic": "probability",
    "urlEnding": "field-imperfection",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "g26Xw4NiF4dA8d7qR7Nb",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Field Imperfection",
    "topic": "probability",
    "urlEnding": "field-imperfection"
  }
}
```
