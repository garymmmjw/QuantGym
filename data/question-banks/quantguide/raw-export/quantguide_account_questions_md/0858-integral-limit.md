# QuantGuide Question

## 858. Integral Limit

**Metadata**

- ID: `nYobBMqlhOIXBRlIGeCp`
- URL: https://www.quantguide.io/questions/integral-limit
- Topic: pure math
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: MAO 2022
- Tags: Calculus
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-30 23:18:41 America/New_York
- Last Edited By: Gabe

### 题干

Fix $\varepsilon > 0$. Compute \(\displaystyle \lim _{n \rightarrow \infty} n \int_{1}^{1 + \varepsilon} \frac{1}{1+x^{n}} d x\). Your answer will be in the form $\ln(k)$ for a constant $k$. Find $k$.

### Hint

Let \(u=x^{-1}\). Then \(x=u^{-1}\) and \(d x=-u^{-2} d u\). Also 

### 解答

Let \(u=x^{-1}\). Then \(x=u^{-1}\) and \(d x=-u^{-2} d u\). So this \(u\)-sub yields

\[
\begin{aligned}
\lim _{n \rightarrow \infty} n \int_{\frac{1}{1+\varepsilon}}^{1} \frac{1}{1+u^{-n}} u^{-2} d u & =\lim _{n \rightarrow \infty} n \int_{\frac{1}{1+\varepsilon}}^{1} \sum_{k=1}^{\infty}(-1)^{k+1} u^{k n-2} d u \\
& =\sum_{k=1}^{\infty}(-1)^{k+1} \lim _{n \rightarrow \infty} \int_{\frac{1}{1+\varepsilon}}^{1} n u^{k n-2} d u \\
& =\sum_{k=1}^{\infty}(-1)^{k+1} \lim _{n \rightarrow \infty} \frac{n}{k n-1}\left(1-\frac{1}{(1+\varepsilon)^{k n-1}}\right) \\
& =\sum_{k=1}^{\infty}(-1)^{k+1} \frac{1}{k}=\ln (2),
\end{aligned}
\]

The last sum there is well-known to converge to $\ln(2)$. We change the order of integration, summation, and limits using the absolute convergence of this sum on $|u| < 1$. Our answer is $k = 2$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "nYobBMqlhOIXBRlIGeCp",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:18:41 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7026154,
    "source": "MAO 2022",
    "status": "published",
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Integral Limit",
    "topic": "pure math",
    "urlEnding": "integral-limit",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "nYobBMqlhOIXBRlIGeCp",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Integral Limit",
    "topic": "pure math",
    "urlEnding": "integral-limit"
  }
}
```
