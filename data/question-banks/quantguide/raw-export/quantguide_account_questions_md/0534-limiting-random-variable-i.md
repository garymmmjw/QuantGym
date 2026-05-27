# QuantGuide Question

## 534. Limiting Random Variable I

**Metadata**

- ID: `1JzdYhRItT7oTG1tEkQo`
- URL: https://www.quantguide.io/questions/limiting-random-variable-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Millennium Management
- Source: Millenium OA
- Tags: Limit Theorems
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Let $X_1,X_2,\dots$ be a sequence of IID random variables with mean $5$ and variance $20$. It is also known the third and fourth moments of $X_1$ are finite. Let $$Y_n = \dfrac{X_1^2 + X_2^2X_3X_4 + X_5^2 + X_6^2X_7X_8 + \dots + X_{4n-3}^2 + X_{4n-2}^2X_{4n-1}X_{4n}}{n}$$ Find $\displaystyle \lim_{n \rightarrow \infty} \mathbb{E}[Y_n]$. If this limit does not exist, enter $-1$. 

### Hint

Define $Z_n = X_{4n-3}^2 + X_{4n-2}^2X_{4n-1}X_{4n}$. Then $Y_n = \dfrac{Z_1 + \dots + Z_n}{n}$.

### 解答

Define $Z_n = X_{4n-3}^2 + X_{4n-2}^2X_{4n-1}X_{4n}$. Then $Y_n = \dfrac{Z_1 + \dots + Z_n}{n}$. by substituting in. Therefore, as the $Z_i$ random variables are IID, $\mathbb{E}[Y_n] = \dfrac{1}{n} \cdot n \mathbb{E}[Z_1] = \mathbb{E}[Z_1]$. By substituting in the definition of $Z_1$, $\mathbb{E}[Z_1] = \mathbb{E}[X_1^2 + X_2^2X_3X_4]$. 

$$$$

By linearity of expectation and independence, $\mathbb{E}[Z_1] = \mathbb{E}[X_1^2] + \mathbb{E}[X_2^2]\mathbb{E}[X_3]\mathbb{E}[X_4]$. We can quickly compute $\mathbb{E}[X_1^2] = \text{Var}(X_1) + (\mathbb{E}[X_1])^2 = 25 + 20 = 45$, so $\mathbb{E}[Z_1] = 45 + 45 \cdot 5 \cdot 5 = 1170$, so $\mathbb{E}[Y_n] = 1170$ for all $n$, meaning $1170$ is our answer.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1170"
    ],
    "companies": [
      {
        "company": "Millennium Management"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "1JzdYhRItT7oTG1tEkQo",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 4248599,
    "randomizable": "",
    "source": "Millenium OA",
    "status": "published",
    "tags": [
      {
        "tag": "Limit Theorems"
      }
    ],
    "title": "Limiting Random Variable I",
    "topic": "probability",
    "urlEnding": "limiting-random-variable-i"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Millennium Management"
      }
    ],
    "difficulty": "easy",
    "id": "1JzdYhRItT7oTG1tEkQo",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Limit Theorems"
      }
    ],
    "title": "Limiting Random Variable I",
    "topic": "probability",
    "urlEnding": "limiting-random-variable-i"
  }
}
```
