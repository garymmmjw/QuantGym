# QuantGuide Question

## 923. Chord on a Square

**Metadata**

- ID: `6SWNCQyFrwa0keMLgWqo`
- URL: https://www.quantguide.io/questions/chord-on-a-square
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: https://www.youtube.com/watch?v=CSmutquIKLY&ab_channel=MindYourDecisions
- Tags: Continuous Random Variables, Calculus
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-26 23:02:50 America/New_York
- Last Edited By: Aaron

### 题干

Two points $p_1$ and $p_2$ are placed uniformly at random along the border of a square which has side length 1. The probability that the distance between $p_1$ and $p_2$ is greater than 1 can be expressed as $\frac{a-\pi}{b}$. What is $\frac{a}{b}$? 

### Hint

Find the conditional probability of the second point being a distance of at least 1 away given the placement of the first point. 

### 解答

Pick the first point $p_1$ first, then rotate the square so that the edge containing $p_1$ is on top. We define a random variable $X$ to be the distance of $p_1$ from the upper-left vertex of the square, let $p(X)$ denote the probability of the second point being a distance of at least 1 away (It is a function of $X$ since it is impacted by the placement of $p_1$). Next, let's consider some basic cases to build intuition. If $p_1$ is on the corners of the edge then the probability the remaining point is a distance of >1 away is $\frac{1}{2}$. In other words, if $X=0$ or $X=1$ then $p(X) = \frac{1}{2}$. If $X = \frac{1}{2}$ or in the center, then let's consider where the second point can fall to satisfy our condition. Clearly, it can fall anywhere on the bottom edge, but on the sides, it needs to be low enough so that the hypotenuse of the triangle formed by the top and side edge is greater than 1. Specifically, it needs to be at least $\sqrt{1^2 - (\frac{1}{2})^2} = \sqrt{\frac{3}{4}}$ from the top. Therefore, $p(X = \frac{1}{2}) = \frac{3-2\sqrt{\frac{3}{4}}}{4}$. Following the same logic, we can do this calculation for some general $x$, so more generally we get that $p(X=x) = \frac{3 - \sqrt{1 - x^2} - \sqrt{2x - x^2}}{4}$. 
$$$$
Finally, to calculate the probability we compute 
$$
\frac{1}{4} \int_{0}^{1} (3 - \sqrt{1 - x^2} - \sqrt{2x - x^2}) \,dx = \frac{6-\pi}{8}
$$
giving us our final answer of $\frac{a=6}{b=8} = \frac{3}{4}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3/4"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "6SWNCQyFrwa0keMLgWqo",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-26 23:02:50 America/New_York",
    "lastEditedBy": "Aaron",
    "orderId": 7558367,
    "source": "https://www.youtube.com/watch?v=CSmutquIKLY&ab_channel=MindYourDecisions",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Calculus"
      }
    ],
    "title": "Chord on a Square",
    "topic": "probability",
    "urlEnding": "chord-on-a-square",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "6SWNCQyFrwa0keMLgWqo",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Calculus"
      }
    ],
    "title": "Chord on a Square",
    "topic": "probability",
    "urlEnding": "chord-on-a-square"
  }
}
```
