# QuantGuide Question

## 288. Segment Traversal

**Metadata**

- ID: `wqIjRqn607AZKpHcZopw`
- URL: https://www.quantguide.io/questions/segment-traversal
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Hudson River Trading, Virtu Financial
- Source: hrt
- Tags: Expected Value, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-10-29 22:55:36 America/New_York
- Last Edited By: Gabe

### 题干

You select a uniformly random starting point on the circumference of a circle, say $P_1$. Then, you select another uniformly random point on the circumference, $P_2$, and draw a line segment between $P_1$ and $P_2$. You then continue to select uniformly random points on the circumference of the circle, say $P_3, \dots,  P_n$, and draw a line segment between $P_i$ and $P_{i+1}$ for each $1 \leq i \leq n-1$. Lastly, you draw a line segment from $P_n$ back to $P_1$. Find the expected number of intersections between line segments  on the interior of the circle as a function of $n$. Evaluate this for $n = 12$.

### Hint

In total, there are $n$ line segments when the process is done. How many pairs of line segments are there to have intersections? How many of those pairs can't intersect? For the ones that can, what is the probability of intersection?

### 解答

In total, there are $n$ line segments when the process is done. This means that there are $\displaystyle \binom{n}{2}$ pairs of line segments that could possibly intersect. However, not all of these have equal probabilities of intersecting. In particular, each of the $n$ points selected represents the intersection of two line segments on the circumference of the circle, meaning that those two segments can't intersect inside the circle. Therefore, we must subtract $n$ possible pairs of line segments that could intersect, as those $n$ pairs can't intersect each other inside the circle. This yields $\displaystyle \binom{n}{2} - n$ possible pairs of line segments that can intersection. By linearity of expectation and the exchangeability of the remaining pairs, we just need to now find the probability of intersection between any two line segments to find the total number of expected intersections.

$$$$

Our question can be formalized as the following: Suppose that we have $X_1,X_2,X_3,$ and $X_4$ selected uniformly at random from the circumference of a circle. Draw a chord between $X_1$ and $X_2$ and a chord between $X_3$ and $X_4$. Find the probability that the chords intersect. Since the circle is rotationally invariant, we can just lock in $X_1$ at $(1,0)$. Then, we can consider all possible orderings of $X_2,X_3,$ and $X_4$ in terms of distance (radians CCW) from the origin. By drawing out the different permutations, you can see that there is an intersection between the segments if $X_2$ is between $X_3$ and $X_4$ (or vice versa). This corresponds to $2$ of the $3! = 6$ possible orderings of the random variables, so the probability is $1/3$. 

$$$$

The above yields that the expected number of intersections is $\dfrac{\binom{n}{2} - n}{3} = \dfrac{n(n-3)}{6}$. In particular, $n = 12$ here yields $18$ intersections on average.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "18"
    ],
    "companies": [
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "wqIjRqn607AZKpHcZopw",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-29 22:55:36 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2221942,
    "source": "hrt",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Segment Traversal",
    "topic": "probability",
    "urlEnding": "segment-traversal",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "hard",
    "id": "wqIjRqn607AZKpHcZopw",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Segment Traversal",
    "topic": "probability",
    "urlEnding": "segment-traversal"
  }
}
```
