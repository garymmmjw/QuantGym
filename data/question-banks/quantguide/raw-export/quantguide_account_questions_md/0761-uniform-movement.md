# QuantGuide Question

## 761. Uniform Movement

**Metadata**

- ID: `Byx7GUx5OljoSOMmPHs6`
- URL: https://www.quantguide.io/questions/uniform-movement
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Citadel, DRW, WorldQuant
- Source: Citadel OA, edited
- Tags: Expected Value, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-5 00:21:47 America/New_York
- Last Edited By: Gabe

### 题干

Let $X,Y \sim \text{Unif}(3,4)$ IID. Find $\mathbb{E}[|X-Y|]$.

### Hint

Note that $X = 3 + U_1$ and $Y = 3 + U_2$, where $U_1,U_2 \sim \text{Unif}(0,1)$ IID. Therefore, we can really write this as $$\mathbb{E}[|(3+U_1) - (3 + U_2)|] = \mathbb{E}[|U_1 - U_2|]$$

### 解答

Note that $X = 3 + U_1$ and $Y = 3 + U_2$, where $U_1,U_2 \sim \text{Unif}(0,1)$ IID. Therefore, we can really write this as $$\mathbb{E}[|(3+U_1) - (3 + U_2)|] = \mathbb{E}[|U_1 - U_2|]$$ The trick here is that $|U_1 - U_2|$ is the length of the middle segment of two order statistics of the $\text{Unif}(0,1)$ random variable. This is because of the absolute value here denoting that we look at the length of the middle segment between the two order statistics. In expectation, each of the intervals $(0,\text{min}\{U_1,U_2\}), (\text{min}\{U_1,U_2\}, \text{max}\{U_1,U_2\}),$ and $(\text{max}\{U_1,U_2\}),1)$ should be the same length. Therefore, as their lengths sum to $1$, each should be $\dfrac{1}{3}$ in length. In particular, this means that $\mathbb{E}[|X-Y|] = \mathbb{E}[|U_1 - U_2|] = \dfrac{1}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/3"
    ],
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "DRW"
      },
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "Byx7GUx5OljoSOMmPHs6",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 00:21:47 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6209599,
    "source": "Citadel OA, edited",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Uniform Movement",
    "topic": "probability",
    "urlEnding": "uniform-movement",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "DRW"
      },
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "easy",
    "id": "Byx7GUx5OljoSOMmPHs6",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Uniform Movement",
    "topic": "probability",
    "urlEnding": "uniform-movement"
  }
}
```
