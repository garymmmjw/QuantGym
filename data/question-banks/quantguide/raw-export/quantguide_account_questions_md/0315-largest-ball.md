# QuantGuide Question

## 315. Largest Ball

**Metadata**

- ID: `uLUwMHj0ytbH69J8zfdf`
- URL: https://www.quantguide.io/questions/largest-ball
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: Kaushik - Cut the Knot
- Tags: Combinatorics, Expected Value
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-12 22:54:10 America/New_York
- Last Edited By: Kaushik

### 题干

There are $20$ balls in an urn labeled from $1$ through $20$. You pick $10$ balls out of this urn. What is the expected maximum value of the $10$ balls you picked out?


### Hint

Solve for a generalized version of this problem then plug in the specific problem values. The hockey stick identity may be helpful here.

### 解答

We can actually solve this problem for a more generalized form. Let $k$ be the largest ball when we choose n balls from a total of $N$ in the urn. Then we have to choose $n-1$ balls from $k-1$ balls. Going through all possible values of $k$ ($n$ to $N$), and using linearity of expectation, we get the following equation:
$$$$

$$\begin{aligned} \mathbb{E} & =\frac{\displaystyle \sum_{k=n}^N k\left(\begin{array}{l}k-1 \\ n-1\end{array}\right)}{\left(\begin{array}{l}N \\ n\end{array}\right)}=\frac{\displaystyle \sum_{k=n}^N n\left(\begin{array}{l}k \\ n\end{array}\right)}{\left(\begin{array}{c}N \\ n\end{array}\right)}=\frac{n}{\left(\begin{array}{c}N \\ n\end{array}\right)}\left[\left(\begin{array}{c}N \\ n\end{array}\right)+\left(\begin{array}{c}n+1 \\ n\end{array}\right)+\cdots+\left(\begin{array}{c}N \\ n\end{array}\right)\right]\end{aligned}$$ The term in the parentheses is just $\displaystyle \binom{N+1}{n+1}$ by the hockey stick identity. Therefore, our answer is $$\frac{n}{\left(\begin{array}{c}N \\ n\end{array}\right)}\left(\begin{array}{l}N+1  \\n+1\end{array}\right)=\frac{n(N+1)}{(n+1)}$$

$$$$
Plugging in $10$ for $n$ and $20$ for $N$, we get a final answer of $\dfrac{210}{11}$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "210/11"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": true,
    "id": "uLUwMHj0ytbH69J8zfdf",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-12 22:54:10 America/New_York",
    "lastEditedBy": "Kaushik",
    "orderId": 2451621,
    "source": "Kaushik - Cut the Knot",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Largest Ball",
    "topic": "probability",
    "urlEnding": "largest-ball",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "uLUwMHj0ytbH69J8zfdf",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Largest Ball",
    "topic": "probability",
    "urlEnding": "largest-ball"
  }
}
```
