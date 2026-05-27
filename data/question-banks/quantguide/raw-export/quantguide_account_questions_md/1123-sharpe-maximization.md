# QuantGuide Question

## 1123. Sharpe Maximization

**Metadata**

- ID: `fsXMV8BLD95BsW3LqaL8`
- URL: https://www.quantguide.io/questions/sharpe-maximization
- Topic: finance
- Difficulty: hard
- Internal Difficulty: 3
- Companies: WorldQuant
- Source: worldquant
- Tags: Pure Math, Finance
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-30 23:14:46 America/New_York
- Last Edited By: Gabe

### 题干

Suppose you have two assets, say $A$ and $B$. It is known that asset $A$ has expected excess returns of $7\%$ and asset $B$ has expected excess returns of $4\%$. The covariance matrix of the excess returns of $A$ and $B$ is given by $\begin{bmatrix} 1 & 1 \\ 1 & 2 \end{bmatrix}$. Constraining to holding $1$ unit of assets total (i.e. if you buy $a$ units of asset $A$ and $b$ units of asset $b$, $a+b = 1$), how many units of asset $A$ should be held to maximize the expected Sharpe Ratio of the portfolio consisting of some combination of assets $A$ and $B$?

### Hint

Let $R_A$ and $R_B$ be the excess returns of $A$ and $B$. From the covariance matrix, we see that $\text{Var}(R_A) = 1$ and $\text{Var}(R_B) = 2$. Furthermore, we get that $\text{Cov}(R_A,R_B) = 1$. Let $a$ be the weight we give to asset $A$. Then $1-a$ is what we assign to asset $B$. From the question, we are given that $\mathbb{E}[R_A] = 7$ and $\mathbb{E}[R_B] = 4$. We are looking to maximize the value of $$\dfrac{\mathbb{E}[aR_A + (1-a)R_B]}{\sqrt{\text{Var}(aR_A + (1-a)R_B)}}$$

### 解答

Let $R_A$ and $R_B$ be the excess returns of $A$ and $B$. From the covariance matrix, we see that $\text{Var}(R_A) = 1$ and $\text{Var}(R_B) = 2$. Furthermore, we get that $\text{Cov}(R_A,R_B) = 1$. Let $a$ be the weight we give to asset $A$. Then $1-a$ is what we assign to asset $B$. From the question, we are given that $\mathbb{E}[R_A] = 7$ and $\mathbb{E}[R_B] = 4$. We are looking to maximize the value of $$\dfrac{\mathbb{E}[aR_A + (1-a)R_B]}{\sqrt{\text{Var}(aR_A + (1-a)R_B)}}$$ The numerator is easy to calculate. Namely, by Linearity of Expectation, we have that $$\mathbb{E}[aR_A + (1-a)R_B] = a\mathbb{E}[R_A] + (1-a)\mathbb{E}[R_B] = 7a + 4(1-a) = 3a+4$$

We use the variance of sum formula to calculate the variance of our new portfolio. Namely, $$\text{Var}(aR_A + (1-a)R_B) = a^2\text{Var}(R_A) + (1-a)^2 \text{Var}(R_B) + 2a(1-a)\text{Cov}(R_A,R_B) = a^2 + 2(1-a)^2 + 2a(1-a)$$ this means the function we have to maximize in $a$ is $$\dfrac{3a+4}{\sqrt{a^2 + 2(1-a)^2 + 2a(1-a)}}$$ Skipping the derivative step, we get that the derivative of the above in $a$ is $$-\dfrac{7a-10}{\left(a^2+2a\left(1-a\right)+2\left(1-a\right)^2\right)^\frac{3}{2}}$$ This has a zero at $a = \dfrac{10}{7}$, and since our derivative was positive before it became $0$ and switches to negative, we can conclude this is a maximum.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "10/7"
    ],
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "fsXMV8BLD95BsW3LqaL8",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:14:46 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9242319,
    "source": "worldquant",
    "status": "published",
    "tags": [
      {
        "tag": "Pure Math"
      },
      {
        "tag": "Finance"
      }
    ],
    "title": "Sharpe Maximization",
    "topic": "finance",
    "urlEnding": "sharpe-maximization",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "hard",
    "id": "fsXMV8BLD95BsW3LqaL8",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Pure Math"
      },
      {
        "tag": "Finance"
      }
    ],
    "title": "Sharpe Maximization",
    "topic": "finance",
    "urlEnding": "sharpe-maximization"
  }
}
```
