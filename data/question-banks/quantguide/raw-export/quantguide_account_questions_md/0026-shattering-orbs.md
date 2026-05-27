# QuantGuide Question

## 26. Shattering Orbs

**Metadata**

- ID: `ERUkLp1l5OziD6obRUYs`
- URL: https://www.quantguide.io/questions/shattering-orbs
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: Virtu Financial
- Source: N/A
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-29 22:54:47 America/New_York
- Last Edited By: Gabe

### 题干

$$7$ orbs are labeled $1-7$ and are linked linearly in a vertical stack from the ceiling with orb 1 being a part of the ceiling and orb 7 being closest to the floor. Each orb is attached to adjacent orbs by a chain link. At each time step, one of the remaining links is going to be uniformly at random selected and cut. As a result, all the orbs below that link will fall and shatter. What is the expected number of cuts needed until orb 1 is the only remaining orb?

### Hint

Let $a_n$ be the expected number of cuts needed with $n$ links. Condition on the position of the first cut to derive a recurrence relation for $a_n$ and then consider the difference $a_n - a_{n-1}$.

### 解答

We are going to solve this for the general case of when there are $n$ links. Let $a_n$ be the expected number of cuts needed with $n$ links. We want to find a recurrence relation for $a_n$. To do this, let's consider what happens after the first cut. If we cut at link $k$, $1 \leq k \leq n$, where link $1$ connects orbs $1$ and $2$, then this means we have $k-1$ links above it still standing. Thus, we have added $1$ to our count and want to now find the same expectation but starting from $k-1$ links instead of $n$. Mathematically, this means that $a_n = \displaystyle \dfrac{1}{n} \sum_{k=1}^n (1 + a_{k-1})$, as with probability $\dfrac{1}{n}$, we cut each given link on the first step. This is just Law of Total Expectation above, where we have conditioned on the position of the first cut. We index shift this sum by $1$ to get $a_n = \dfrac{1}{n} \displaystyle \sum_{k=0}^{n-1} (1 + a_k) = 1 + \dfrac{1}{n} \sum_{k=0}^{n-1} a_k$.

$$$$

Now, consider $a_n - a_{n-1}$. Using the recurrence relation above, we obtain that $$a_n - a_{n-1} = \displaystyle 1 + \dfrac{1}{n}\sum_{k=0}^{n-1}a_k - \left(1 + \dfrac{1}{n-1} \sum_{k=0}^{n-2}a_k\right) = \dfrac{1}{n} a_{n-1} + \left(\dfrac{1}{n} - \dfrac{1}{n-1}\right)\sum_{k=0}^{n-2} a_k$$ Note that $\dfrac{1}{n} - \dfrac{1}{n-1} = -\dfrac{1}{n(n-1)}$, so the above reduces to $$a_n - a_{n-1} = \displaystyle \dfrac{1}{n}a_{n-1} - \dfrac{1}{n}\left[\dfrac{1}{n-1} \sum_{k=0}^{n-2}a_k\right]$$ The term in brackets is just $a_{n-1} - 1$ by our original recurrence relation. Therefore, $a_n - a_{n-1} = \dfrac{1}{n}a_{n-1} - \dfrac{1}{n}(a_{n-1} - 1) = \dfrac{1}{n}$. Rearranging, $a_n = a_{n-1} + \dfrac{1}{n}$. Our initial condition on this that makes physical sense is that $a_1 = 1$, as we only have one link to select from and we cut it on our first trial.

$$$$

With this initial condition, we can recurse and clearly see that $$a_n = a_{n-1} + \dfrac{1}{n} = a_{n-2} + \dfrac{1}{n-1} + \dfrac{1}{n} = \dots = a_1 + \dfrac{1}{2} + \dots + \dfrac{1}{n} = \sum_{k=1}^n \dfrac{1}{k}$$ Therefore, this is our solution for general $n$, and our specific case is when $n = 6$, as we have $6$ links. Thus, the final result is $\dfrac{49}{20}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "49/20"
    ],
    "companies": [
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "ERUkLp1l5OziD6obRUYs",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-29 22:54:47 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 192488,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Shattering Orbs",
    "topic": "probability",
    "urlEnding": "shattering-orbs",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "hard",
    "id": "ERUkLp1l5OziD6obRUYs",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Shattering Orbs",
    "topic": "probability",
    "urlEnding": "shattering-orbs"
  }
}
```
