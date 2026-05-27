# QuantGuide Question

## 643. Uniform Product II

**Metadata**

- ID: `sOrjHakDk7NUbpCMXR0J`
- URL: https://www.quantguide.io/questions/uniform-product-ii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: Kaushik - HOTS
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-16 09:35:31 America/New_York
- Last Edited By: Gabe

### 题干

Let $X,Y \sim \text{Unif}(0,1)$ IID. Find $\mathbb{P}\left[XY > \dfrac{1}{2}\right]$. Round your answer to the nearest hundredth. 

### Hint

Plot the area that fits our requirements in the plane and set up an integral representing that area.

### 解答

Plot the line $XY > 0.5$ within the unit square. You'll see its a curved line from point $(0.5, 1)$ to $(1, 0.5)$. We can find the area under this curve and take its compliment to find the answer to this question (from $0.5 \leq x \leq 1$). Thus
$$\mathbb{P}[XY > 0.5]=\int_{0.5}^{1}\left(1 - {\frac{1}{2x}}\right)dx$$
$$=\frac{1}{2}\left(1+\ln\left(\frac{1}{2}\right)\right)\approx0.15$$


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.15"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "sOrjHakDk7NUbpCMXR0J",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-16 09:35:31 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5118482,
    "source": "Kaushik - HOTS",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Uniform Product II",
    "topic": "probability",
    "urlEnding": "uniform-product-ii",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "sOrjHakDk7NUbpCMXR0J",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Uniform Product II",
    "topic": "probability",
    "urlEnding": "uniform-product-ii"
  }
}
```
