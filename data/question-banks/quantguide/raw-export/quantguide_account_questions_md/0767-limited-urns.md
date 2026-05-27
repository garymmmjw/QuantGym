# QuantGuide Question

## 767. Limited Urns

**Metadata**

- ID: `hcWZt0jJ74ZMYInB9y7e`
- URL: https://www.quantguide.io/questions/limited-urns
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: cambridge
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 22:04:06 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that there are $n$ identical urns each containing white and black balls. The $i$th urn, where $1 \leq i \leq n$, contains 1 white ball and $2^i - 1$ black balls. You randomly select an urn and then draw one ball at random from it. The ball is white. Let $p(n)$ be the probability that if you replace this ball and again draw a ball at random from the same urn then the ball drawn on the second occasion is also white. Compute $\displaystyle \lim_{n \rightarrow \infty} p(n)$.

### Hint

Condition on drawing from Urn $k$, $1 \leq k \leq n$, and then let $n \rightarrow \infty$.

### 解答

Let $W_1$ denote the event that the white ball is drawn on the first draw, and $W_2$ denote the event that the white ball is drawn on the second draw. $W_1^c$ and $W_2^c$ would then represent the events of drawing a black ball on draws $1$ and $2$, respectively. We want to find $\mathbb{P}[W_2 \mid W_1]$. Let the event $U_i$ be when urn $i$ is selected. Since we select the urn uniformly random, $\mathbb{P}[U_i] = \dfrac{1}{n}$, for all $1 \leq i \leq n$. Suppose we select urn $1 \leq k \leq n$. There is 1 white ball and $2^k - 1$ black balls in it. There is independence between draws, as the ball selected is replaced after the first draw. Thus, on either draw, since we select the ball completely at random, $\mathbb{P}[W_1 \mid U_k] = \mathbb{P}[W_2 \mid U_k] = \dfrac{1}{2^k}$, and $\mathbb{P}[W_1^c \mid U_k] = \mathbb{P}[W_2^c \mid U_k] = \dfrac{2^k-1}{2^k}$. We have the conditioning on $U_k$, as we assumed that we are in urn $k$. Thus, the probability of two white balls, given we are in urn $k$, by independence is just $\mathbb{P}[W_1W_2 \mid U_k] = \mathbb{P}[W_1 \mid U_k]\mathbb{P}[W_2 \mid U_k] = \dfrac{1}{4^k}$. The second draw from the urn is either a white ball or a black ball, so the other case to consider is if we are in urn $k$, what is the probability the second ball is black? By independence:  \[\begin{aligned}     \mathbb{P}[W_1W_2^c \mid U_k] = \mathbb{P}[W_1 \mid U_k]\mathbb{P}[W_2 \mid U_k] = \dfrac{2^k - 1}{4^k} = \dfrac{1}{2^k} - \dfrac{1}{4^k}. \end{aligned}\] We want $\mathbb{P}[W_2 \mid W_1] = \dfrac{\mathbb{P}[W_1W_2]}{\mathbb{P}[W_1]}$ by conditional probability. On the top, we condition on all $n$ urns, as we can get two white balls from urn 1, from urn 2, etc. By the Law of Total Probability, we have:  \[\begin{aligned}     \mathbb{P}[W_1W_2] = \mathbb{P}[W_1W_2 \mid U_1]\mathbb{P}[U_1] + \mathbb{P}[W_1W_2 \mid U_2]\mathbb{P}[U_2] + \dots + \mathbb{P}[W_1W_2 \mid U_n]\mathbb{P}[U_n] \end{aligned}\]  We know that each $\mathbb{P}[U_i] = \dfrac{1}{n}$, as well as that for all $1 \leq i \leq n$, $\mathbb{P}[W_1W_2 \mid U_i] = \dfrac{1}{4^i}$. By substitution:  \[\begin{aligned}     \mathbb{P}[W_1W_2] &= \dfrac{1}{4} \cdot \dfrac{1}{n} + \dfrac{1}{4^2} \cdot \dfrac{1}{n} + \dots + \dfrac{1}{4^n} \cdot \dfrac{1}{n} \\ &= \dfrac{1}{n}\displaystyle \sum_{j=1}^n \left(\dfrac{1}{4}\right)^j \end{aligned}\]  On the bottom, we can have the first draw be a white ball by having the first being a white ball and the second being white OR having the second draw being black. Thus, the denominator is going to be $\mathbb{P}[W_1] = \mathbb{P}[W_1W_2] + \mathbb{P}[W_1W_2^c]$, as those two events are disjoint. The first term in this sum is the numerator. We are going to apply the Law of Total Probability to our denominator by conditioning on the urns again to get:  \[\begin{aligned}     \mathbb{P}[W_1W_2^c] = \mathbb{P}[W_1W_2^c \mid U_1]\mathbb{P}[U_1] + \mathbb{P}[W_1W_2^c \mid U_2]\mathbb{P}[U_2] + \dots + \mathbb{P}[W_1W_2^c \mid U_n]\mathbb{P}[U_n] \end{aligned}\]      The $\mathbb{P}[U_i]$ term is the same as in the numerator, and we also have that:      \[\begin{aligned}     \mathbb{P}[W_1W_2^c \mid U_i] = \dfrac{2^i - 1}{4^i} = \dfrac{1}{2^i} - \dfrac{1}{4^i}, \forall 1 \leq i \leq n \end{aligned}\]  $$$$  Thus, we have: \[\begin{aligned}     \mathbb{P}[W_1W_2^c] &= \dfrac{2 - 1}{4} \cdot \dfrac{1}{n} + \dfrac{2^2 - 1}{4^n} \cdot \dfrac{1}{n} + \dots + \dfrac{2^n - 1}{4^n} \cdot \dfrac{1}{n} \\ &= \dfrac{1}{n}\displaystyle \sum_{j=1}^n \dfrac{2^j - 1}{4^j} \end{aligned}\]    And therefore:  \[\begin{aligned}     \mathbb{P}[W_2 \mid W_1] &= \dfrac{\dfrac{1}{n}\displaystyle \sum_{j=1}^n \left(\dfrac{1}{4}\right)^j}{\dfrac{1}{n}\displaystyle \sum_{j=1}^n \left(\dfrac{1}{4}\right)^j + \dfrac{1}{n}\displaystyle \sum_{j=1}^n \dfrac{2^j - 1}{4^j}} \\ &= \dfrac{\displaystyle \sum_{j=1}^n \left(\dfrac{1}{4}\right)^j}{\displaystyle \sum_{j=1}^n \left(\dfrac{1}{4}\right)^j + \displaystyle{\sum_{j=1}^n\left(\left(\dfrac{1}{2}\right)^j - \left(\dfrac{1}{4}\right)^j\right)}} \\ &= \dfrac{\displaystyle \sum_{j=1}^n \left(\dfrac{1}{4}\right)^j}{\displaystyle \sum_{j=1}^n \left(\dfrac{1}{2}\right)^j} \end{aligned}\]  All that is left is to take the limit as $n \rightarrow \infty$. Note that sums are then geometric when we shift the initial index of the summation to start at 0 such that $\displaystyle \sum_{j=1}^n \left(\dfrac{1}{4}\right)^j = \dfrac{1}{4}\displaystyle \sum_{j=1}^n \left(\dfrac{1}{4}\right)^{j-1}$. The sum evaluates to $\dfrac{1}{1 - \frac{1}{4}} = \dfrac{4}{3}$, so with the factor of $\dfrac{1}{4}$ out front, the numerator evaluates to $\dfrac{1}{3}$. On the denominator, $\displaystyle \sum_{j=1}^n \left(\dfrac{1}{2}\right)^j = \dfrac{1}{2} \displaystyle \sum_{j=1}^n \left(\dfrac{1}{2}\right)^{j-1} = \dfrac{1}{2} \cdot \dfrac{1}{1 - \frac{1}{2}} = 1$. As the sum in the numerator approaches $\dfrac{1}{3}$ and the sum in the denominator approaches $1$ as $n \rightarrow \infty$, $p(n) \rightarrow \dfrac{1}{3}$ as $n \rightarrow \infty$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/3"
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "hcWZt0jJ74ZMYInB9y7e",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 22:04:06 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6270719,
    "randomizable": "",
    "source": "cambridge",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Limited Urns",
    "topic": "probability",
    "urlEnding": "limited-urns",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "hcWZt0jJ74ZMYInB9y7e",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Limited Urns",
    "topic": "probability",
    "urlEnding": "limited-urns"
  }
}
```
