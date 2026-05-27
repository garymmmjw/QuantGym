# QuantGuide Question

## 787. Independent Children

**Metadata**

- ID: `JJ0J5VONGo5PorGZwsqA`
- URL: https://www.quantguide.io/questions/independent-children
- Topic: probability
- Difficulty: easy
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Events
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Consider a family of $n$ children with $n \geq 2$. Let $A$ be the event that the family has at least one child of each gender and $B$ be the event that there is at most one girl in the family. Assume each child is equally likely to be born a boy or girl. Find the unique value of $n$ such that $A$ and $B$ are independent.

### Hint

To demonstrate independence, we must have that $\mathbb{P}[A\cap B] = \mathbb{P}[A]\mathbb{P}[B]$

### 解答

To demonstrate independence, we must have that $\mathbb{P}[A\cap B] = \mathbb{P}[A]\mathbb{P}[B]$. We first find $\mathbb{P}[A]$ and $\mathbb{P}[B]$. For $A$, the probability that with $n$ children there is at least one of each gender is easily calculated via the complement. The probability of all boys or all girls is just $\dfrac{2}{2^n} = \dfrac{1}{2^{n-1}}$, so the probability of at least one child of each gender is $\mathbb{P}[A] = 1 - \dfrac{1}{2^{n-1}}$. For $\mathbb{P}[B]$, we can either have $0$ or $1$ girls in the family of $n$, so there is $1$ outcome where we have all boys (equivalently, 0 girls) and $n$ outcomes where we have one girl (choose the birth location of the girl among the $n$), so $\mathbb{P}[B] = \dfrac{n+1}{2^n}$. For $\mathbb{P}[A \cap B]$, we need the probability of at most one girl and at least one boy and one girl. This is just the second case that went into calculating $\mathbb{P}[B]$, as that was exactly $1$ girl and at least $1$ boy, so $\mathbb{P}[A \cap B] = \dfrac{n}{2^n}$.

$$$$

Now, we must solve $\dfrac{n}{2^n} = \dfrac{2^{n-1} - 1}{2^{n-1}} \cdot \dfrac{n+1}{2^n}$ for $n$. Multiplication by $2^{2n-1}$ and rearranging yields that $2^{n-1} = n+1$, which can be seen to be equal at $n = 3$ by testing a few values.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "difficulty": "easy",
    "id": "JJ0J5VONGo5PorGZwsqA",
    "internalDifficulty": 0,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 6408927,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Independent Children",
    "topic": "probability",
    "urlEnding": "independent-children"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "JJ0J5VONGo5PorGZwsqA",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Independent Children",
    "topic": "probability",
    "urlEnding": "independent-children"
  }
}
```
