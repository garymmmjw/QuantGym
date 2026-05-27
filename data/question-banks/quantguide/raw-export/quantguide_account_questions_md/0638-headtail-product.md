# QuantGuide Question

## 638. Head-Tail Product

**Metadata**

- ID: `r9suT9aL5uTQwCgCYqJU`
- URL: https://www.quantguide.io/questions/headtail-product
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Discrete Random Variables, Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:32:41 America/New_York
- Last Edited By: Gabe

### 题干

Billy flips a fair coin $n$ times. Let $X$ denote the number of heads, and let $Y$ denote the number of tails. $\mathbb{E}[XY]$ can be expressed in the form 
\[\begin{aligned}
\frac{an^2 + bn + c}{d}
\end{aligned}\]
for some integers $a, b, c, d$, where $a, b, c$ are each relatively prime with $d$. Compute $a + b + c + d$. 

### Hint

If $X$ heads are flipped out of a total of $n$ coin tosses, then $Y = n - X$ tails are flipped.

### 解答

If $X$ heads are flipped out of a total of $n$ coin tosses, then $Y = n - X$ tails are flipped. Let's substitute this expression in for $Y$, simplify, and apply the linearity of expectation. 
\[\begin{aligned}
    \mathbb{E}[XY] &= \mathbb{E}[X(n - X)] \\
    &= n \cdot \mathbb{E}[X] - \mathbb{E}[X^2]
\end{aligned}\]
Note that $X \sim \text{Binom}(n, 0.5)$. Recall that for some $Z \sim \text{Binom}(n, p)$, $\mathbb{E}[Z] = np$ and $\text{Var}(Z) = npq$, where $q = 1 - p$. So, 
\[\begin{aligned}
    \mathbb{E}[X] &= \frac{n}{2} \\
    \text{Var}[X] &= \frac{n}{4}
\end{aligned}\]
We can compute $\mathbb{E}[X^2]$ as follows:
\[\begin{aligned}
    \text{Var}[X] &= \mathbb{E}[X^2] - (\mathbb{E}[X])^2 \\
    &= \frac{n}{4} \\
    \Rightarrow \mathbb{E}[X^2] &= \frac{n}{4} + \left( \frac{n}{2} \right)^2 \\
\end{aligned}\]
Returning to our original expression of interest,
\[\begin{aligned}
    \mathbb{E}[XY] &= \mathbb{E}[X(n - X)] \\
    &= n \cdot \mathbb{E}[X] - \mathbb{E}[X^2] \\
    &= \frac{n^2}{2} - \frac{n^2}{4} - \frac{n}{4} \\
    &= \frac{n^2 - n}{4}.
\end{aligned}\]
Our solution is therefore $1 - 1 + 4 = 4$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "r9suT9aL5uTQwCgCYqJU",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:32:41 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5089674,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Head-Tail Product",
    "topic": "probability",
    "urlEnding": "headtail-product",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "r9suT9aL5uTQwCgCYqJU",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Head-Tail Product",
    "topic": "probability",
    "urlEnding": "headtail-product"
  }
}
```
