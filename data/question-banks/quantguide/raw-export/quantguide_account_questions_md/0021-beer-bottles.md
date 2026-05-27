# QuantGuide Question

## 21. Beer Bottles

**Metadata**

- ID: `Fsolgsdnl1tcki9zPjTd`
- URL: https://www.quantguide.io/questions/beer-bottles
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 5
- Companies: N/A
- Source: Regeneron
- Tags: Expected Value, Limit Theorems
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-2 22:12:24 America/New_York
- Last Edited By: Gabe

### 题干

Bob is singing the traditional song, “$N$ Bottles of Beer.” With each verse, he counts down the number of bottles. The first verse contains the lyrics “$N$ bottles of beer,” the second verse contains the lyrics “$N-1$ bottles of beer,” and so on. The last verse contains the lyrics “1 bottle of beer.” There’s just one problem: Bob has early onset Alzheimer's. When completing any given verse, he has a tendency to forget which verse he's on. When this happens, he finishes the verse he is currently singing and then goes back to the beginning of the song (with $N$ bottles) on the next verse.
 
For each verse, suppose you have a $\frac{1}{N}$ chance of forgetting which verse you are currently singing. Let $K$ denote the expected number of verses in the song. Compute $\lim_{N \rightarrow \infty} \frac{K}{N}$. The answer is in the form $ae-b$ for integers $a$ and $b$. Find $a^2 + b^2$.

### Hint

Build a transition matrix between states. Recursively solve for $K$.

### 解答

It is easy to construct a transition graph. Let $\mu_j$ denote the expected number of times Bob sings verses when the current verse contains the lyrics “$j$ bottles of beer.” Then, we can write the following equations modeling absorption time:
\[\begin{aligned}
    \mu_N &= 1 + \frac{1}{N} \mu_N + \frac{N - 1}{N} \mu_{N - 1} \\
    \mu_{N-1} &= 1 + \frac{1}{N} \mu_N + \frac{N - 1}{N} \mu_{N - 2} \\
    &\quad \vdots \\
    \mu_{j} &= 1 + \frac{1}{N} \mu_N + \frac{N - 1}{N} \mu_{j - 1} \\
    &\quad \vdots \\
    \mu_{2} &= 1 + \frac{1}{N} \mu_N + \frac{N - 1}{N} \mu_{1} \\
    \mu_1 &= 1
\end{aligned}\]
We simply need to solve for $K = \mu_N$. Let's begin substituting. 
\[\begin{aligned}
    \mu_N &= 1 + \frac{1}{N} \mu_N + \frac{N - 1}{N} \mu_{N - 1} \\
    &= 1 + \frac{1}{N} \mu_N + \frac{N - 1}{N} \left( 1 + \frac{1}{N} \mu_N + \frac{N - 1}{N} \mu_{N - 2} \right) \\
    &= \left(1 + \frac{N - 1}{N}\right)\left( 1 + \frac{\mu_N}{N} \right) + \left(\frac{N-1}{N}\right)^2 \mu_{N - 2} \\
    &= \left( 1 + \frac{N-1}{N} + \left(\frac{N - 1}{N}\right)^2 \right)\left( 1 + \frac{\mu_N}{N} \right) + \left(\frac{N-1}{N}\right)^3 \mu_{N - 3} \\
    &= \left( 1 + \frac{N-1}{N} + \left(\frac{N - 1}{N}\right)^2 + \ldots + \left( \frac{N - 1}{N} \right)^{N - 2}\right)\left( 1 + \frac{\mu_N}{N} \right) + \left(\frac{N - 1}{N}\right)^{N - 1} \mu_{1} \\
    &= \left( 1 + \frac{N-1}{N} + \left(\frac{N - 1}{N}\right)^2 + \ldots + \left( \frac{N - 1}{N} \right)^{N - 2}\right)\left( 1 + \frac{\mu_N}{N} \right) + \left(\frac{N - 1}{N}\right)^{N - 1}
\end{aligned}\]
Note that
\[\begin{aligned}
    1 + \frac{N-1}{N} + \left(\frac{N - 1}{N}\right)^2 + \ldots + \left( \frac{N - 1}{N} \right)^{N - 2} &= 1 \cdot \left( \frac{1 - \left(\frac{N - 1}{N}\right)^{N - 1}}{1 - \frac{N - 1}{N}} \right) \\
    &= N - N\left(\frac{N - 1}{N}\right)^{N - 1}
\end{aligned}\]
Substituting and solving for $\mu_N$, we find
\[\begin{aligned}
    \mu_N &= N - N\left(\frac{N - 1}{N}\right)^{N - 1} + \left( 1 - 1\left(\frac{N - 1}{N}\right)^{N - 1} \right) \mu_N + \left(\frac{N - 1}{N}\right)^{N - 1} \\
    \mu_N &= \frac{N - N\left(\frac{N - 1}{N}\right)^{N - 1}}{\left(\frac{N - 1}{N}\right)^{N - 1}} + \left(\frac{N - 1}{N}\right)^{N - 1}
\end{aligned}\]
Our final task is to compute
\[\begin{aligned}
    \lim_{N \rightarrow \infty} \frac{1}{N} \left( \frac{N - N\left(\frac{N - 1}{N}\right)^{N - 1}}{\left(\frac{N - 1}{N}\right)^{N - 1}} + \left(\frac{N - 1}{N}\right)^{N - 1} \right)
\end{aligned}\]
Let's solve.
\[\begin{aligned}
    \lim_{N \rightarrow \infty} \frac{1}{N} \left( \frac{N - N\left(\frac{N - 1}{N}\right)^{N - 1}}{\left(\frac{N - 1}{N}\right)^{N - 1}} + \left(\frac{N - 1}{N}\right)^{N - 1} \right) &= \lim_{N \rightarrow \infty}\left( \frac{1 - \left(\frac{N - 1}{N}\right)^{N - 1}}{\left(\frac{N - 1}{N}\right)^{N - 1}}  \right) + \lim_{N \rightarrow \infty} \left(\dfrac{1}{N} \cdot \left(\frac{N - 1}{N}\right)^{N - 1} \right)\\
    &= \lim_{N \rightarrow \infty} \left( \frac{N^{N-1} - (N-1)^{N-1}}{(N-1)^{N-1}} \right) + \lim_{N \rightarrow \infty} \left(\dfrac{1}{N} \cdot \left(\frac{N - 1}{N}\right)^{N - 1} \right) \\
    &= \lim_{N \rightarrow \infty} \left( \frac{N}{N-1}\right)^{N-1} - 1 + \lim_{N \rightarrow \infty} \left(\dfrac{1}{N} \cdot \left(\frac{N - 1}{N}\right)^{N - 1} \right)
\end{aligned}\]
Recall
\[\begin{aligned}
    e &= \lim_{x \rightarrow \infty} \left( 1 + \frac{1}{x} \right)^x \\
    &= \lim_{x \rightarrow \infty} \left( \frac{x + 1}{x} \right)^x
\end{aligned}\]
Let $x = N - 1$. 
\[\begin{aligned}
    e &= \lim_{N \rightarrow \infty} \left( \frac{N}{N - 1} \right)^{N - 1}
\end{aligned}\]
Similarly, 
\[\begin{aligned}
    \frac{1}{e} &= \lim_{N \rightarrow \infty} \left(\frac{N - 1}{N}\right)^{N - 1}
\end{aligned}\]
This means the last term goes to $0$, as we have the extra $\dfrac{1}{N}$ term out back.
Substituting, we find
\[\begin{aligned}
    \lim_{N \rightarrow \infty} \frac{K}{N} = \boxed{e - 1}
\end{aligned}\]

Our answer is $1^2 + 1^2 = 2$.

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
    "id": "Fsolgsdnl1tcki9zPjTd",
    "internalDifficulty": 5,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-2 22:12:24 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 172278,
    "source": "Regeneron",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Limit Theorems"
      }
    ],
    "title": "Beer Bottles",
    "topic": "probability",
    "urlEnding": "beer-bottles",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "Fsolgsdnl1tcki9zPjTd",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Limit Theorems"
      }
    ],
    "title": "Beer Bottles",
    "topic": "probability",
    "urlEnding": "beer-bottles"
  }
}
```
