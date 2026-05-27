# QuantGuide Question

## 505. Variance Product

**Metadata**

- ID: `fv3e7tNDUwCzsdCQhxOO`
- URL: https://www.quantguide.io/questions/variance-product
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Suppose that $X$ and $Y$ are independent random variables with $\mathbb{E}[X] = 4, \mathbb{E}[Y] = -3, \mathbb{E}[X^2] = 20,$ and $\mathbb{E}[Y^2] = 45$. Compute Var$(XY)$.

### Hint

Expand out using Var$(Z) = \mathbb{E}[Z^2] - (\mathbb{E}[Z])^2$ and use properties of independence.

### 解答

Var$(XY) = \mathbb{E}[X^2Y^2] - (\mathbb{E}[XY])^2$. By independence, $\mathbb{E}[XY] = \mathbb{E}[X]\mathbb{E}[Y] = -12$. The first term can be obtained by the same idea that $\mathbb{E}[X^2Y^2] = \mathbb{E}[X^2]\mathbb{E}[Y^2] = 20 \cdot 45 = 900$ by independence. Thus, Var$(XY) = 900 - (-12)^2 = 756$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "756"
    ],
    "difficulty": "easy",
    "id": "fv3e7tNDUwCzsdCQhxOO",
    "internalDifficulty": 0,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 4040938,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Variance Product",
    "topic": "statistics",
    "urlEnding": "variance-product"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "fv3e7tNDUwCzsdCQhxOO",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Variance Product",
    "topic": "statistics",
    "urlEnding": "variance-product"
  }
}
```
