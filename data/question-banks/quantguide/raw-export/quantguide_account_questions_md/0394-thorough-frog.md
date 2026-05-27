# QuantGuide Question

## 394. Thorough Frog

**Metadata**

- ID: `joCTDf6tiumaMq4zdk9A`
- URL: https://www.quantguide.io/questions/thorough-frog
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: https://www.math.ucdavis.edu/~gravner/MAT135A/resources/chpr.pdf
- Tags: Stochastic Processes, Conditional Expectation
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-4 20:58:04 America/New_York
- Last Edited By: Gabe

### 题干

A frog has $100$ lily pads arranged in a circle. Each one has a distinct number $0,1,\dots, 99$ on it, arranged in increasing order counter-clockwise starting from $0$. The frog starts at lily pad $0$ and hops to the closest lily pad on the left or right of its current position with equal probability per hop. Find the probability that when the frog lands on lily pad $50$ for the first time, it has visited every other lily pad not labeled $50$.

### Hint

For lily pad $50$ to be the truly last lily pad the frog hasn't visited, the frog must first get to lily pad $49$ or $51$. Each one is equally likely to be the first neighbor of $50$ that the frog hops to by the symmetry of the frog hopping.

### 解答

For lily pad $50$ to be the truly last lily pad the frog hasn't visited, the frog must first get to lily pad $49$ or $51$. Each one is equally likely to be the first neighbor of $50$ that the frog hops to by the symmetry of the frog hopping. WLOG, say the frog hops to lily pad $49$ first. Now, we can treat $49$ as our new $0$, and we can consider a rightwards hop as $+1$ and a leftwards hop as $-1$. This is now asking the probability the frog (now a "random walker") hits $-98$ before hitting $1$. We only need to hit $-98$ since we just need to visit the other neighbor of $50$, which is $51$. This lily pad is $98$ hops in the other direction. Therefore, since this is a simple symmetric random walk, the probability this occurs is just $$\dfrac{1}{1+98} = \dfrac{1}{99}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/99"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "joCTDf6tiumaMq4zdk9A",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-4 20:58:04 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3090878,
    "source": "https://www.math.ucdavis.edu/~gravner/MAT135A/resources/chpr.pdf",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Processes"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Thorough Frog",
    "topic": "probability",
    "urlEnding": "thorough-frog",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "joCTDf6tiumaMq4zdk9A",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Stochastic Processes"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Thorough Frog",
    "topic": "probability",
    "urlEnding": "thorough-frog"
  }
}
```
