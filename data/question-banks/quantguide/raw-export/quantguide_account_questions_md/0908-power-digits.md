# QuantGuide Question

## 908. Power Digits

**Metadata**

- ID: `Cm2jQHsHG0AXkb922kZU`
- URL: https://www.quantguide.io/questions/power-digits
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: AMC
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-5 00:16:09 America/New_York
- Last Edited By: Gabe

### 题干

$$m$ is randomly selected from $\{111, 133, 155, 177, 199\}$. $n$ is randomly selected from $\{2004, 2005, \ldots, 2023\}$. What is the probability that $m^n$ has a $1$ as the units digit? 

### Hint

Only the units digit is relevant, so we can consider the first set as $\{1, 3, 5, 7, 9\}$ instead. Note that, by Euler's theorem, $x^4 \equiv 1 \mod 10$ if $\gcd(x, 10) = 1$.

### 解答

Only the units digit is relevant, so we can consider the first set as $\{1, 3, 5, 7, 9\}$ instead. Note that, by Euler's theorem, $x^4 \equiv 1 \mod 10$ if $\gcd(x, 10) = 1$. There are 5 numbers in $\{2004, 2005, \ldots, 2023\}$ that are divisible by $4$, and $m$ may equal $1, 3, 7, 9$. Additionally, $11^{x} \equiv 1 \mod 10$ for any positive integer $x$. We must therefore add $15$, since $5$ values of $n$ that are divisible by $4$ have already been accounted for. Finally, we notice that $19^{2x} = 361^x \cong 1 \mod 10$ for any positive integer $2x$, so we must add $5$ values of $n$ that are divisible by $2$ but not by $4$ to avoid overcounting. Our probability is therefore
\[
\begin{aligned}
    \frac{4 \cdot 5 + 15 + 5}{5 \cdot 20} &= \frac{2}{5}    
\end{aligned}
\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/5"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "Cm2jQHsHG0AXkb922kZU",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 00:16:09 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7454507,
    "source": "AMC",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Power Digits",
    "topic": "probability",
    "urlEnding": "power-digits",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "Cm2jQHsHG0AXkb922kZU",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Power Digits",
    "topic": "probability",
    "urlEnding": "power-digits"
  }
}
```
