# QuantGuide Question

## 1146. Log Square

**Metadata**

- ID: `bPDUDa63qKgUXulmj9H9`
- URL: https://www.quantguide.io/questions/log-square
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: https://quant.stackexchange.com/questions/45295/log-of-square-of-geometric-brownian-motion?rq=1
- Tags: Stochastic Calculus
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-2 09:48:01 America/New_York
- Last Edited By: Gabe

### 题干

Consider solving the SDE $dM = \sigma M dW_t$. The two methods below yield different answers in calculating $d \ln M^2$, so one of them is incorrect. Let $a = 1$ if the first method is incorrect and $a = 2$ if the second is incorrect. Let $l$ be the first line number in the solution that is incorrect. Find $100a + l$.

$$$$

$\textbf{Method 1}$
$$
\begin{aligned}
& d M^2=\left(M^2\right)^{\prime} d M+\frac{1}{2}\left(M^2\right)^{\prime \prime} d[M,M] \\
& d M^2=2 M d M+d[M,M] \\
& d M^2=2 \sigma M^2 d W_t+\sigma^2 M^2 d t \\
& \frac{d M^2}{M^2}=2 \sigma d W_t+\sigma^2 d t \\
& d \ln M^2=2 \sigma d W_t+\sigma^2 d t
\end{aligned}
$$
$\textbf{Method 2}$
$$
\begin{aligned}
&d \ln M^2=\left(\ln M^2\right)^{\prime} d M+\frac{1}{2}\left(\ln M^2\right)^{\prime \prime} d[M,M]\\
&d \ln M^2=\frac{2 M}{M^2} d M+\frac{1}{2}\left(\frac{2 M}{M^2}\right)^{\prime} d[M,M]\\
&d \ln M^2=\frac{2}{M} d M+\frac{1}{2}\left(\frac{2}{M}\right)^{\prime} d[M,M]\\
&d \ln M^2=\frac{2}{M} d M-\frac{1}{2} \frac{2}{M^2} d[M,M]\\
&d \ln M^2=\frac{2}{M} d M-\frac{1}{M^2} d[M,M]\\
&d \ln M^2=2 \sigma d W-\sigma^2 d t
\end{aligned}
$$

### Hint

Consider Ito's Formula. Where would it be violated?

### 解答

Method 1 is incorrect. The line that is incorrect is Line 5, as $\dfrac{dM^2}{M^2} \neq d\ln M^2$. Namely, it is missing the Ito term out back involving the quadratic variation. One can also see that Method 1 is incorrect by considering $\ln M^2 = 2 \ln M$, so calculating the dynamics of $\ln M$ is even easier.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "105"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "bPDUDa63qKgUXulmj9H9",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-2 09:48:01 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9440106,
    "source": "https://quant.stackexchange.com/questions/45295/log-of-square-of-geometric-brownian-motion?rq=1",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Log Square",
    "topic": "pure math",
    "urlEnding": "log-square",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "bPDUDa63qKgUXulmj9H9",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Log Square",
    "topic": "pure math",
    "urlEnding": "log-square"
  }
}
```
