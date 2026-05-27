# QuantGuide Question

## 1194. No More Than Four

**Metadata**

- ID: `XN7jCSG4EwDRN1zHdyTA`
- URL: https://www.quantguide.io/questions/no-more-than-four
- Topic: probability
- Difficulty: easy
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Alex tosses two dice $n$ times. The probability that the sum of the values on the two dice faces is at most $4$ in at least one of the $n$ tosses is $p$. Find the maximum value of $n$ such that $p < 0.5$. 

### Hint

Let $X$ denote the value of the sum of the two dice faces. Let $p(x)$ denote the pmf of $X$. Note the following:
\[\begin{aligned}
p(x) &= \begin{cases}
\frac{1}{36} & \text{ if $x = 2$} \\
\frac{2}{36} & \text{ if $x = 3$} \\
\frac{3}{36} & \text{ if $x = 4$} \\
\frac{4}{36} & \text{ if $x = 5$} \\
\frac{5}{36} & \text{ if $x = 6$} \\
\frac{6}{36} & \text{ if $x = 7$} \\
\frac{5}{36} & \text{ if $x = 8$} \\
\frac{4}{36} & \text{ if $x = 9$} \\
\frac{3}{36} & \text{ if $x = 10$} \\
\frac{2}{36} & \text{ if $x = 11$} \\
\frac{1}{36} & \text{ if $x = 12$} \\
0 & \text{ otherwise}
\end{cases}
\end{aligned}\]

### 解答

Let $X$ denote the value of the sum of the two dice faces. Let $p(x)$ denote the pmf of $X$. Note the following:
\[\begin{aligned}
p(x) &= \begin{cases}
\frac{1}{36} & \text{ if $x = 2$} \\
\frac{2}{36} & \text{ if $x = 3$} \\
\frac{3}{36} & \text{ if $x = 4$} \\
\frac{4}{36} & \text{ if $x = 5$} \\
\frac{5}{36} & \text{ if $x = 6$} \\
\frac{6}{36} & \text{ if $x = 7$} \\
\frac{5}{36} & \text{ if $x = 8$} \\
\frac{4}{36} & \text{ if $x = 9$} \\
\frac{3}{36} & \text{ if $x = 10$} \\
\frac{2}{36} & \text{ if $x = 11$} \\
\frac{1}{36} & \text{ if $x = 12$} \\
0 & \text{ otherwise}
\end{cases}
\end{aligned}\]
The event that the sum of the values on the two dice faces is at most $7$ for one toss is $\mathbb{P}(X \leq 5) = \sum_{x = 2}^4 p(x) = \frac{1}{6}$. The complement is then $\mathbb{P}(X > 5) = \frac{5}{6}$. Since the sum from each of the $n$ two-dice-tossing rounds is independent from the sums of other rounds, the probability that there is no sum less than or equal to $4$ after $n$ rounds is $\left( \frac{5}{6} \right)^n$. The probability that there is at least one sum less than or equal to $4$ after $n$ rounds is then $1 - \left( \frac{5}{6} \right)^n$. 
\[\begin{aligned}
1 - \left( \frac{5}{6} \right)^n &< 0.5 \\
\left( \frac{5}{6} \right)^n &> \frac{1}{2} \\
\left( \frac{5}{6} \right)^4 < \frac{1}{2} < \left( \frac{5}{6} \right)^3 \\
\Rightarrow n = 3.
\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "difficulty": "easy",
    "id": "XN7jCSG4EwDRN1zHdyTA",
    "internalDifficulty": 0,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 9921607,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "No More Than Four",
    "topic": "probability",
    "urlEnding": "no-more-than-four"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "XN7jCSG4EwDRN1zHdyTA",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "No More Than Four",
    "topic": "probability",
    "urlEnding": "no-more-than-four"
  }
}
```
