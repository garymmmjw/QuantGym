# QuantGuide Question

## 914. Gamma Review IV

**Metadata**

- ID: `O1eZEB0RGO9DGAw6gYHa`
- URL: https://www.quantguide.io/questions/gamma-review-iv
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: original
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Suppose that $X \sim \text{Gamma}\left(8,\dfrac{1}{3}\right)$. Compute $\text{Var}(e^{X})$. The answer is in the form $a^b - \left(\dfrac{a}{2}\right)^c$ for integers $a,b,$ and $c$. Find $abc$.

### Hint

By definition, we have that $\text{Var}(e^X) = \mathbb{E}[e^{2X}] - (\mathbb{E}[e^X])^2$, Note that the MGF of a random variable $X$ is given by $M_X(\theta) = \mathbb{E}\left[e^{\theta X}\right]$.

### 解答

By definition, we have that $\text{Var}(e^X) = \mathbb{E}[e^{2X}] - (\mathbb{E}[e^X])^2$, Note that the MGF of a random variable $X$ is given by $M_X(\theta) = \mathbb{E}\left[e^{\theta X}\right]$. Therefore, we can rewrite the previous expression as $M_X(2) - (M_X(1))^2$. For our given distribution, we have that $M_X(\theta) = \left(1 - \dfrac{\theta}{3}\right)^{-8}$. This can be easily derived or also can be just taken from a table of known MGFs. Thus, $M_X(1) = \left(\dfrac{3}{2}\right)^8$, while $M_X(2) = 3^8$, so $$\text{Var}(e^X) = 3^8 - \left(\dfrac{3}{2}\right)^{16}$$ Therefore, $a = 3, b = 8, c = 16$, so $abc = 384$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "384"
    ],
    "companies": [],
    "difficulty": "medium",
    "id": "O1eZEB0RGO9DGAw6gYHa",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 7484993,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Gamma Review IV",
    "topic": "probability",
    "urlEnding": "gamma-review-iv"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "O1eZEB0RGO9DGAw6gYHa",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Gamma Review IV",
    "topic": "probability",
    "urlEnding": "gamma-review-iv"
  }
}
```
