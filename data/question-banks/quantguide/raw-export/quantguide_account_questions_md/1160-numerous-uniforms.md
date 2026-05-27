# QuantGuide Question

## 1160. Numerous Uniforms

**Metadata**

- ID: `LvYElF9rQSTZk1EVHk2h`
- URL: https://www.quantguide.io/questions/numerous-uniforms
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: N/A
- Source: common ish question but from gabe book
- Tags: Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:32:29 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that $X_1,\dots, X_7 \sim \text{Unif}(0,1)$. Find the PDF of $Y = X_1X_2\dots X_{7}$. The answer is in the form $f(x) = \dfrac{(-\log(x))^a}{b}I_{(0,1)}(x)$ for integers $a$ and $b$. Find $a + b$.

### Hint

Take the logarithm of both sides and note that if $X \sim \text{Unif}(0,1)$, then $-\log(X) \sim \text{Exp}(1)$.

### 解答

We solve this for general $n$ and then plug in at the end. The trick here is to take the logarithm of both sides and note that if $X \sim \text{Unif}(0,1)$, then $-\log(X) \sim \text{Exp}(1)$. The reason we want to take the logarithm is because of the fact that the logarithm will turn a product into a sum. Therefore, we have that $$\log(Y) = \log(X_1\dots X_n) = \log(X_1) + \dots + \log(X_n)$$ Multiplying each side by $-1$, $$-\log(Y) = (-\log(X_1)) + (-\log(X_2)) + \dots + (-\log(X_n))$$ Note that since each of the $X_i$ are independent, the sequence of $-\log(X_i)$ are also independent. Since each one is $\text{Exp}(1)$ distributed, then we have that the RHS is the sum of $n$ IID $\text{Exp}(1)$ random variables. Therefore, the RHS is $\text{Gamma}(n,1)$ distributed. We have that $-\log(Y) = G$, where $G \sim \text{Gamma}(n,1)$. In other words, the distribution of $Y$ is therefore that of $Y = e^{-G}$, where $G \sim \text{Gamma}(n,1)$. 
$$$$

We don't have the CDF of $G$ in explicit form, so we use fragmentation. Since $Y = f(G) = e^{-G}$, the inverse is just $h^{-1}(y) = -\log(y)$, so that $|(h^{-1}(g))'| = \dfrac{1}{g}$. Therefore, the PDF of $Y$ is $$f_Y(y) = \dfrac{(-\log(y))^{n-1}e^{\log(y)}}{\Gamma(n)} \cdot \dfrac{1}{y}I_{(0,\infty)}(-\log(y)) = \dfrac{(-\log(y))^{n-1}}{\Gamma(n)}I_{(0,\infty)}(-\log(y))$$ The indicator says that $0 < -\log(y) < \infty$, which $\log(y) < 0$, or that $0 < y < 1$. Therefore, $f_Y(y) = \dfrac{(-\log(y))^{n-1}}{\Gamma(n)}I_{(0,1)}(y)$. Plugging in $n = 7$, we have that $a = 6$ and $b = \Gamma(7) = 6! = 720$. This means $a + b = 726$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "726"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "LvYElF9rQSTZk1EVHk2h",
    "internalDifficulty": 4,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:32:29 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9631446,
    "randomizable": "",
    "source": "common ish question but from gabe book",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Numerous Uniforms",
    "topic": "probability",
    "urlEnding": "numerous-uniforms"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "LvYElF9rQSTZk1EVHk2h",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Numerous Uniforms",
    "topic": "probability",
    "urlEnding": "numerous-uniforms"
  }
}
```
