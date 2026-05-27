# QuantGuide Question

## 629. Marble Runs

**Metadata**

- ID: `CYuP6Dmb6oljgSEkgedA`
- URL: https://www.quantguide.io/questions/marble-runs
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: DRW, Hudson River Trading
- Source: N/A
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-24 15:53:11 America/New_York
- Last Edited By: Gabe

### 题干

You repeatedly draw marbles from a bag containing 50 red and 50 blue marbles until there are no more marbles left, recording the order of red and blue marbles drawn. You then count the number of "runs,'' where a run is defined as any number of consecutive marbles of the same color. For example, $RBBRRRBRR$ contains 5 runs. What is the expected number of runs that you observe?

### Hint

The number of runs is equal to the number of starts of runs. How can you use indicator variables and the linearity of expectation to break down the problem into the expected number of starts of runs per marble?

### 解答

Let us define random variables $X_1, \ldots, X_{100}$ such that
\[
\begin{aligned}
X_i &= 
\begin{cases}
1 & \text{ if the $i$-th draw is the beginning of a new run } \\
0 & \text{ otherwise}
\end{cases}
\end{aligned}
\]
In the case of $RBBRRRBRR$, for example, we would have $X_1 = 1, X_2 = 1, X_4 = 1, X_7 = 1, X_8 = 1$. Note that, for a sequence of $100$ red and blue marbles drawn in any order, it is always the case that $X_1 = 1$. Let $Z$ represent the total number of runs. 
\[
\begin{aligned}
Z &= \sum_{i = 1}^{100} X_i
\end{aligned}
\]
By the linearity of expectation, 
\[
\begin{aligned}
\mathbb{E}\left[ Z \right] &= \mathbb{E} \left[ \sum_{i = 1}^{100} X_i \right] \\
&= \sum_{i = 1}^{100}  \mathbb{E} \left[ X_i \right] \\
&= 1 + \sum_{i = 2}^{100}  \mathbb{E} \left[ X_i \right] 
\end{aligned}
\]
Now let's consider $\mathbb{E}[X_i] = \mathbb{P}(X_i = 1)$ for $i \geq 2$. 
\[
\begin{aligned}
\mathbb{P}(X_i = 1) &= \mathbb{P}(\left( \text{$(i-1)$-th draw $R$}, \text{$i$-th draw $B$} \right) \cup \left( \text{$(i-1)$-th draw $B$}, \text{$i$-th draw $R$} \right)) \\
&= 2 \cdot \mathbb{P}( \text{$(i-1)$-th draw $R$}, \text{$i$-th draw $B$} ) \\
&= 2 \cdot \mathbb{P} (\text{$i$-th draw $B$} \,|\, \text{$(i-1)$-th draw $R$}) \cdot \mathbb{P} (\text{$(i-1)$-th draw $R$}) 
\end{aligned}
\]
The probability that the $(i-1)$-th draw is red is simply $\frac{50}{100}$. The probability that the $i$-th draw is blue given that the previous draw is red is simply $\frac{50}{99}$. Plugging this in, we find
\[
\begin{aligned}
\mathbb{P}(X_i = 1) &= 2 \cdot \frac{50}{100} \cdot \frac{50}{99} \\
&= \frac{50}{99} \\
&= \mathbb{E}[X_i]
\end{aligned}
\]
Therefore, 
\[
\begin{aligned}
\mathbb{E}\left[ Z \right] &= 1 + \sum_{i = 2}^{100} \frac{50}{99} \\
&= 51
\end{aligned}
\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "51"
    ],
    "companies": [
      {
        "company": "DRW"
      },
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "CYuP6Dmb6oljgSEkgedA",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-24 15:53:11 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5017610,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Marble Runs",
    "topic": "probability",
    "urlEnding": "marble-runs",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "DRW"
      },
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "hard",
    "id": "CYuP6Dmb6oljgSEkgedA",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Marble Runs",
    "topic": "probability",
    "urlEnding": "marble-runs"
  }
}
```
