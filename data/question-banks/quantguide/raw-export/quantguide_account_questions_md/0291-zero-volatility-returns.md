# QuantGuide Question

## 291. Zero Volatility Returns

**Metadata**

- ID: `b66D0SWlTjg15tEzBPCu`
- URL: https://www.quantguide.io/questions/zero-volatility-returns
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: https://quant.stackexchange.com/questions/519/missing-step-in-stock-price-movement-equations
- Tags: Stochastic Calculus
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-26 22:41:14 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that $dS_t = \mu S_t dt + \sigma S_t \sqrt{dt}$ with $\sigma = 0$ and $\mu = 1$. Find $\dfrac{S_2}{S_0}$. The answer is in the form $e^a$ for some $a$. Find $a$.

### Hint

With $\sigma = 0$, $\dfrac{dS_t}{S_t}$ is now non-random. 

### 解答

With $\sigma = 0$, $\dfrac{dS_t}{S_t}$ is now non-random. Namely, it is just $\mu dt$. Therefore, the ratio here grows at a constant rate $\mu = 1$ that is non-random. Therefore, by approaching this as a standard differential equation and integrating on $(0,2)$, $\ln(S_2/S_0) = 2$, so $S_2/S_0 = e^2$, meaning $a = 2$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "b66D0SWlTjg15tEzBPCu",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-26 22:41:14 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2235391,
    "source": "https://quant.stackexchange.com/questions/519/missing-step-in-stock-price-movement-equations",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Zero Volatility Returns",
    "topic": "finance",
    "urlEnding": "zero-volatility-returns",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "b66D0SWlTjg15tEzBPCu",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Zero Volatility Returns",
    "topic": "finance",
    "urlEnding": "zero-volatility-returns"
  }
}
```
