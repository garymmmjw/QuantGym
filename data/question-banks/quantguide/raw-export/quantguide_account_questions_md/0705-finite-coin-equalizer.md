# QuantGuide Question

## 705. Finite Coin Equalizer

**Metadata**

- ID: `KaCa6Ed8gddzYbxjMAdZ`
- URL: https://www.quantguide.io/questions/finite-coin-equalizer
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: ross
- Tags: Conditional Probability, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-4 13:23:37 America/New_York
- Last Edited By: Gabe

### 题干

Suppose you flip a coin that has probability $0 < p < 1$ of landing heads on each flip. You flip the coin until you have an equal amount of heads and tails appearing for the first time (of course, after the initial state of $0$ for both). For any integer $n \geq 1$, find the probability that you flip the coin exactly $2n$ times. The probability can be written as a function $f(p,n)$. Compute $f(1/3, 5)$ to the nearest ten-thousandth.

### Hint

Use the Ballot Theorem and condition on which parity the last flip is.

### 解答

We are going to use the result of Voter Mayhem (often called the "Ballot Theorem"). We can rephrase the question as follows: What is the probability that exactly $n$ heads and $n$ tails occur in $2n$ flips AND there are always strictly more heads than tails until the last flip. Let $H$ be the event that $n$ heads and $n$ tails occur in $2n$ flips and $M$ be the event that there are always more heads and tails until the last flip. We have that $\mathbb{P}[H \cap M] = \mathbb{P}[M \mid H]\mathbb{P}[H]$. $\mathbb{P}[H]$ is quite easy to compute, as we can use a binomial random variable PMF. In particular, if $X \sim \text{Binom}(2n,p)$, $$\mathbb{P}[H] = \mathbb{P}[X = n] = \binom{2n}{n}p^n(1-p)^n$$ For $\mathbb{P}[M \mid H]$, we know that one of the two people must be ahead the entire time and the last equalizes. We can condition on the parity of the last coin. If it is tails, which occurs with probability $1-p$, then the probability is $P_{n,n-1}$, where the heads must be ahead the entire time. If it is tails, which occurs with probability $p$, then the probability is $P_{n,n-1}$ as well, where the tails must be ahead the entire time. Therefore, adding the two cases up, the probability is $\mathbb{P}[M \mid H] = P_{n,n-1} = \dfrac{1}{2n-1}$. Therefore $$\mathbb{P}[M \cap H] = \dfrac{\displaystyle \binom{2n}{n}p^n(1-p)^n}{2n-1}$$ Evaluating this with $p = 1/3$ and $n = 5$, we get the answer of approximately $0.0152$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.0152"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "KaCa6Ed8gddzYbxjMAdZ",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 13:23:37 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5755209,
    "randomizable": "",
    "source": "ross",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Finite Coin Equalizer",
    "topic": "probability",
    "urlEnding": "finite-coin-equalizer",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "KaCa6Ed8gddzYbxjMAdZ",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Finite Coin Equalizer",
    "topic": "probability",
    "urlEnding": "finite-coin-equalizer"
  }
}
```
