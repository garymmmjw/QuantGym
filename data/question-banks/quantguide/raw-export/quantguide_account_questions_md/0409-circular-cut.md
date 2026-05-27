# QuantGuide Question

## 409. Circular Cut

**Metadata**

- ID: `tI24OWF7YcGDhMwbSRj5`
- URL: https://www.quantguide.io/questions/circular-cut
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: https://www.math.ucdavis.edu/~gravner/MAT135A/resources/chpr.pdf
- Tags: Continuous Random Variables, Expected Value
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-4 20:16:57 America/New_York
- Last Edited By: Gabe

### 题干

Three points are uniformly at random selected from the circumference of the unit circle. These three points divide the circle into three arcs. Find the expected length of the arc that contains the point $(1,0)$. The answer is in the form $q\pi$ for a rational number $q$. Find $q$.

### Hint

The arc containing $(1, 0)$ contains two pieces: the clockwise and counter-clockwise piece. By symmetry, the lengths of these two pieces are equal in expectation. Use the identity $\mathbb{E}[X] = \displaystyle \int_0^{\infty} \mathbb{P}[X \geq x]dx$ somewhere.

### 解答

The arc containing $(1, 0)$ contains two pieces: the clockwise and counter-clockwise piece. By symmetry, the lengths of these two pieces are equal in expectation. Therefore, let $L$ be the length of the clockwise piece. $2L$ is the length of our entire arc containing $(1,0)$. Using the identity $\mathbb{E}[L] = \displaystyle \int_0^{2\pi} \mathbb{P}[L \geq x]dx$, we can compute the expected length in a clean fashion. Namely, $\mathbb{P}[L \geq x]$ is just the probability that there are no points in $(0,x]$. As we have $3$ points, this probability is simply $\left(1 - \dfrac{x}{2\pi}\right)^3$, as each is independently not in that arc with probability $1-\dfrac{x}{2\pi}$. Therefore, we have that $$\mathbb{E}[L] = \displaystyle \int_0^{2\pi} \left(1 - \dfrac{x}{2\pi}\right)^3dx = \dfrac{\pi}{2}$$ This means that the expected length of the full arc containing $(1,0)$ is $\pi$, meaning $q = 1$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "tI24OWF7YcGDhMwbSRj5",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-4 20:16:57 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3210650,
    "source": "https://www.math.ucdavis.edu/~gravner/MAT135A/resources/chpr.pdf",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Circular Cut",
    "topic": "probability",
    "urlEnding": "circular-cut",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "tI24OWF7YcGDhMwbSRj5",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Circular Cut",
    "topic": "probability",
    "urlEnding": "circular-cut"
  }
}
```
