# QuantGuide Question

## 150. Non-Consecutive Sequence

**Metadata**

- ID: `3mGvD3hr6Ir6aOYEl83V`
- URL: https://www.quantguide.io/questions/nonconsecutive-sequence
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: N/A
- Source: og
- Tags: Conditional Probability, Conditional Expectation, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-10-31 08:33:50 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that you flip a coin $n$ times and it turns out that no consecutive heads appear in the sequence. Let $E(n)$ be the expected number of heads that appear given this information. Compute $\displaystyle \lim_{n \rightarrow \infty} \dfrac{E(n)}{n}$. The answer is in the form $\dfrac{a}{b + \sqrt{c}}$ for integers $a,b,$ and $c$ with $c$ minimal. Find $abc$.

### Hint

Break it up into steps. First, compute the conditional probability the sequence starts with $H$. Then, derive a second-order recurrence for $E(n)$ with $A(n)$ as coefficients. Then, suppose $E(n) \sim cn$ and compute $c$.

### 解答

We are going to combine a lot of different results in this question, specifically from Fibonacci Limit I and II. Let $A(n)$ be the number of sequences of length $n$ with no consecutive heads. Then $A(1) = 2$ and $A(2) = 3$ (only $HH$ doesn't satisfy this). For a sequence of length $n$ to satisfy our constraint, it either starts with $T$ or $HT$. It can't start with $HH$, as that would violate the condition. 

$$$$

There are $A(n-1)$ sequences starting with $T$ that satisfy this condition, as the first flip is $T$ and the other $n-1$ spots must not contain any consecutive heads. There are $A(n-2)$ sequences starting with $HT$ by the same logic with with $n-2$ remaining spots. Thus, $A(n) = A(n-1) + A(n-2)$ with $A(1) = 2$ and $A(2) = 3$. This is just the Fibonacci sequence shifted. For the purposes of this question, the exact shift will not matter. All that matters is the amount of shift of the numerator relative to the denominator.

$$$$

We can now derive a recurrence relation for $E(n)$. If the first flip is $T$, which occurs with probability $\dfrac{A(n-1)}{A(n)}$ conditional on there being no consecutive heads ($A(n-1)$ of the $A(n)$ total sequences start with $T$ by the previous paragraph), the expected number of heads is $E(n-1)$, as the first flip is $T$ and we count the number of heads in the remaining $n-1$ spots. 

$$$$

Otherwise, if the first flip is $H$, which occurs with probability $\dfrac{A(n-2)}{A(n)}$, then the expected number of heads is $1 + E(n-2)$, as we obtain $1$ head from the first flip, the second flip must be a tails, and then we count the expected number of heads in the other $n-2$ flips. We also get that $E(1) = 1/2$ and $E(2) = 2/3$ by listing out the valid sequences and counting the number of heads appearing in them. Therefore, we have the following recurrence for $E(n)$: $$E(n) = \dfrac{A(n-1)}{A(n)} E(n-1) + \dfrac{A(n-2)}{A(n)}\left(1 + E(n-2)\right)$$ Note that this is a non-homogenous and non-constant coefficient second order recurrence, so it is very unlikely a nice closed form exists. However, we can get asymptotics on $E(n)$. Suppose that $E(n) \sim cn$ as $n \rightarrow \infty$. Our goal is to find $c$. 

$$$$

At this point, we use Fibonacci Limit I and II. For large $n$ we know that $\dfrac{A(n)}{A(n-1)} \rightarrow \phi$, the golden ratio $\phi = \dfrac{1+\sqrt{5}}{2}$, so $\dfrac{A(n-1)}{A(n)} \rightarrow \dfrac{1}{\phi}$. Similarly, $\dfrac{A(n-2)}{A(n)} \rightarrow \dfrac{1}{\phi + 1}$. Therefore, in limit, we need to find $c$ such that $$cn = \dfrac{1}{\phi} c(n-1) + \dfrac{1}{\phi+1}(1 + c(n-2)) \iff c\left(\dfrac{1}{\phi} + \dfrac{2}{\phi+1}\right) = \dfrac{1}{\phi+1} \iff c = \dfrac{1}{\phi+2} = \dfrac{2}{5 + \sqrt{5}}$$

Thus, the answer is $5 \cdot 5 \cdot 2 = 50$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "50"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "3mGvD3hr6Ir6aOYEl83V",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-31 08:33:50 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1121435,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Non-Consecutive Sequence",
    "topic": "probability",
    "urlEnding": "nonconsecutive-sequence",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "3mGvD3hr6Ir6aOYEl83V",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Non-Consecutive Sequence",
    "topic": "probability",
    "urlEnding": "nonconsecutive-sequence"
  }
}
```
