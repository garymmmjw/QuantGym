# QuantGuide Question

## 786. Doubly 5 I

**Metadata**

- ID: `AXdyPsFl4pbJwFbiJvMz`
- URL: https://www.quantguide.io/questions/doubly-5
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: og
- Tags: Combinatorics, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-10-1 11:53:56 America/New_York
- Last Edited By: Gabe

### 题干

Jenny has a fair $6-$sided die with numbers $1-6$ on the sides. Jenny continually rolls the die and keeps track of the outcomes in the order they appear. Jenny rolls until she sees both $4$ and $6$. Find the probability Jenny observed exactly $2$ $5$s while rolling her die.

### Hint

Break up the event based on when Jenny stops rolling. What needs to occur for her to stop rolling after exactly $n$ rolls? Think about the negative binomial distribution.

### 解答

We are going to break up the event based on when Jenny stops rolling. We know that she needs to roll at least $4$ times, as she needs to observe both $2$ $5$s, as well as a $4$ and a $6$. 

$$$$

Suppose that Jenny stops after $n$ rolls. In the first $n-1$ rolls, she must have obtained exactly $2$ $5$s. There are $\displaystyle \binom{n-1}{2}$ ways to pick the locations of those two fives. Then, the last roll must either be a $4$ or a $6$, and that value must not appear in the rolls beforehand. There are $2$ options for the last roll. WLOG, let it be $6$. In the other $n-3$ rolls that come beforehand, they are able to be any value $1-4$, but there must be at least one $4$ in the sequence so that we have both $4$ and $6$ occur. There are $4^{n-3}$ sequences total for the other $n-3$ rolls, of which we need to exclude the ones with no $4$s in them, which is $3^{n-3}$ sequences. Therefore, there are $4^{n-3}  -3^{n-3}$ sequences for the other rolls. Lastly, there are $6^n$ total sequences of length $n$. Therefore, the probability she stops after $n \geq 4$ rolls is $$\dfrac{\displaystyle 2 \cdot \binom{n-1}{2}\cdot (4^{n-3} - 3^{n-3})}{6^n}$$ To find the total probability, we just sum up over $n$ now. This is the sum $$\displaystyle \sum_{n=4}^{\infty} \dfrac{\displaystyle 2 \cdot \binom{n-1}{2}\cdot (4^{n-3} - 3^{n-3})}{6^n} = 2\left[\sum_{n=4}^{\infty} \binom{n-1}{3-1} \dfrac{1}{6^3} \cdot \left(\dfrac{2}{3}\right)^{n-3} - \sum_{n=4}^{\infty} \binom{n-1}{3-1} \dfrac{1}{6^3} \cdot \left(\dfrac{1}{2}\right)^{n-3}\right]$$ The terms in the parenthesis look similar to Negative Binomial distributions with $r = 3$ and $p = 1/3$ and $1/2$, respectively However, they are slightly off, we need the constant terms $\dfrac{1}{6^3}$ to be $\dfrac{1}{3^3}$ and $\dfrac{1}{2^3}$, respectively. Therefore, we just need to multiply by $2^3$ and $3^3$ in each sum. However, the support of a Negative Binomial starts at $r = 3$, and these start at $r = 4$. To remedy this, it is easy to take the complement to evaluate each sum with the complement and evaluating the PMF at $3$ for each. Doing all of this, $$2\left[\dfrac{1}{2^3}\sum_{n=4}^{\infty} \binom{n-1}{3-1} \dfrac{1}{3^3} \cdot \left(\dfrac{2}{3}\right)^{n-3} - \dfrac{1}{27} \cdot \sum_{n=4}^{\infty} \binom{n-1}{3-1} \dfrac{1}{2^3} \cdot \left(\dfrac{1}{2}\right)^{n-3}\right] = \dfrac{1}{4} \cdot \dfrac{26}{27} - \dfrac{2}{27} \cdot \dfrac{7}{8} = \dfrac{19}{108}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "19/108"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "AXdyPsFl4pbJwFbiJvMz",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-1 11:53:56 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6397719,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Doubly 5 I",
    "topic": "probability",
    "urlEnding": "doubly-5",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "AXdyPsFl4pbJwFbiJvMz",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Doubly 5 I",
    "topic": "probability",
    "urlEnding": "doubly-5"
  }
}
```
