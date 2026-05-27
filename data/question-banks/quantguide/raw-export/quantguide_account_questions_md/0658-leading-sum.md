# QuantGuide Question

## 658. Leading Sum

**Metadata**

- ID: `9q5fW1PvZy9mzcL3cjBg`
- URL: https://www.quantguide.io/questions/leading-sum
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: MAO
- Tags: Calculus
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Written in closed form, the expression \(1^{1000}+2^{1000}+\cdots+n^{1000}\) is a polynomial in \(n\) with leading term \(a n^{1001}\) for some \(a\). Find \(a\).

### Hint

To find $a$, we need to have some polynomial $P(n) = an^{1001}$ for some $a$ such that the limit of this sum divided by $P(n)$ is $1$ as $n \rightarrow \infty$. Think of a Riemann sum.

### 解答

To find $a$, we need to have some polynomial $P(n) = an^{1001}$ for some $a$ such that the limit of this sum divided by $P(n)$ is $1$ as $n \rightarrow \infty$. Using this fact, we can write this as

\[
1=\lim _{n \rightarrow \infty} \frac{\sum_{k=1}^{n} k^{1000}}{P(n)}=\lim _{n \rightarrow \infty} \frac{\sum_{k=1}^{n} k^{1000}}{a n^{1001}}
\]
Distributing the $n$ through and multiplying by $a$, we get that 
\[
a=\lim _{n \rightarrow \infty} \sum_{k=1}^{n}\left(\frac{k}{n}\right)^{1000} \frac{1}{n}=\int_{0}^{1} x^{1000} d x=\frac{1}{1001}
\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/1001"
    ],
    "companies": [],
    "difficulty": "medium",
    "id": "9q5fW1PvZy9mzcL3cjBg",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 5290606,
    "source": "MAO",
    "status": "published",
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Leading Sum",
    "topic": "pure math",
    "urlEnding": "leading-sum"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "9q5fW1PvZy9mzcL3cjBg",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Leading Sum",
    "topic": "pure math",
    "urlEnding": "leading-sum"
  }
}
```
