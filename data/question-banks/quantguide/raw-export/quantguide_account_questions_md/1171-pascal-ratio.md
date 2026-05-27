# QuantGuide Question

## 1171. Pascal Ratio

**Metadata**

- ID: `mAESYBbKOhmOR8DTES1k`
- URL: https://www.quantguide.io/questions/pascal-ratio
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: AOPS
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Row $n$ of Pascal's Triangle contains three successive entries with ratio $3 : 4 : 5$. What is the smallest value of $n$?

### Hint

Three entries (where the middle entry is the $k$-th entry of the $n$-th row) can be written as 
\[\begin{aligned}
    \binom{n}{k-1}, \binom{n}{k}, \binom{n}{k+1}. 
\end{aligned}\] Consider the ratios.

### 解答

Three entries (where the middle entry is the $k$-th entry of the $n$-th row) can be written as 
\[\begin{aligned}
    \binom{n}{k-1}, \binom{n}{k}, \binom{n}{k+1}. 
\end{aligned}\]
Simplifying, we have
\[\begin{aligned}
    \frac{n!}{(k-1)! (n-k+1)!}, \frac{n!}{k! (n-k)!}, \frac{n!}{(k+1)! (n-k-1)!}.
\end{aligned}\]
Now, we have a system of two equations:
\[\begin{aligned}
    4\frac{n!}{(k-1)! (n-k+1)!} &= 3\frac{n!}{k! (n-k)!}, \\
    4\frac{n!}{(k+1)! (n-k-1)!} &= 5\frac{n!}{k! (n-k)!}.
\end{aligned}\]
Let's simplify the first equation.
\[\begin{aligned}
    4\frac{n!}{(k-1)! (n-k+1)!} &= 3\frac{n!}{k! (n-k)!} \\
    4k &= 3(n-k+1) \\
    4k &= 3n - 3k + 3 \\
    7k &= 3n + 3
\end{aligned}\]
On to the second equation.
\[\begin{aligned}
    4\frac{n!}{(k+1)! (n-k-1)!} &= 5\frac{n!}{k! (n-k)!} \\
    5(n - k) &= 4(k + 1) \\
    5n &= 9k + 4
\end{aligned}\]
Solving, we find $n = 62, k = 27$. Our answer is row $62$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "62"
    ],
    "difficulty": "medium",
    "id": "mAESYBbKOhmOR8DTES1k",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 9760215,
    "source": "AOPS",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Pascal Ratio",
    "topic": "brainteasers",
    "urlEnding": "pascal-ratio"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "mAESYBbKOhmOR8DTES1k",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Pascal Ratio",
    "topic": "brainteasers",
    "urlEnding": "pascal-ratio"
  }
}
```
