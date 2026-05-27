# QuantGuide Question

## 1126. A Low Median

**Metadata**

- ID: `VLoOFXEKmGfZpKWe1QNn`
- URL: https://www.quantguide.io/questions/a-low-median
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: IMC, SIG
- Source: IMC 
- Tags: Events
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-29 22:05:42 America/New_York
- Last Edited By: Gabe

### 题干

Suppose we draw 3 numbers from a $\text{Unif}[0,1]$ distribution independently. We then sort the numbers in ascending order. What is the probability that the median is less than $2/3$?

### Hint

Break up into cases of exactly one larger and none larger.

### 解答

If we want the median to be less than $\frac{2}{3}$ then it must be that we can have at most one number be larger than $\frac{2}{3}$. Therefore, we have that 
$$P[\text{exactly one number larger}] = {3 \choose 1} \left(\frac{2}{3}\right)^2 \left(\frac{1}{3}\right) = \frac{4}{9}$$ and we also have 
$$P[\text{exactly zero numbers larger}] =\left(\frac{2}{3}\right)^3 = \frac{8}{27}$$
Adding these together, we have that the probability that at most one number is larger than $\frac{2}{3}$ is $$\displaystyle \frac{4}{9} + \frac{8}{27} = \frac{20}{27}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "20/27"
    ],
    "companies": [
      {
        "company": "IMC"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "VLoOFXEKmGfZpKWe1QNn",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-29 22:05:42 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9280713,
    "source": "IMC ",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "A Low Median",
    "topic": "probability",
    "urlEnding": "a-low-median",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "VLoOFXEKmGfZpKWe1QNn",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "A Low Median",
    "topic": "probability",
    "urlEnding": "a-low-median"
  }
}
```
