# QuantGuide Question

## 115. Multiple Divisors II

**Metadata**

- ID: `USmVUuBAwbFnSP21E4FG`
- URL: https://www.quantguide.io/questions/multiple-divisors-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: MAO
- Tags: Combinatorics, Events
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:59:40 America/New_York
- Last Edited By: Gabe

### 题干

Find the probability that a uniformly randomly selected integer from the set of divisors of $20!$ is divisible by $20$.

### Hint

$$20 = 2^2 \cdot 5$, so this means that whatever factor we select needs to has an exponent of at least $2$ in its prime factorization for $2$s and also needs to be divisible by $5$. Note that $20! = 20 \cdot 19 \cdot 18 \cdot \dots \cdot 2 \cdot 1 = 2^{a} \cdot 5^b \cdot N$ for some integers $a$ and $b$. Find them.

### 解答

$$20 = 2^2 \cdot 5$, so this means that whatever factor we select needs to has an exponent of at least $2$ in its prime factorization for $2$s and also needs to be divisible by $5$. Note that $20! = 20 \cdot 19 \cdot 18 \cdot \dots \cdot 2 \cdot 1 = 2^{18} \cdot 5^4 \cdot N$ by noting that we can extract a power of $2$ from every even integer, an extra power of $2$ from $4,8,12,16,$ and $20$, a third power of $2$ from $8$ and $16$, and then a final power of $2$ from $16$. Similarly, we extract a power of $5$ from $5,10,15,$ and $20$. The number $N$ is irrelevant here, as it will has its own prime factorization that does not include any powers of $2$ nor $5$.

$$$$

Since we select the divisor uniformly at random, the term $2^a 5^b$ will also be uniformly at random in $0 \leq a \leq 18$ and $0 \leq b \leq 4$. The probability that $a \geq 2$ is $\dfrac{17}{19}$, as it is uniformly distributed over $19$ integers. The probability $b \geq 1$ is $\dfrac{4}{5}$ by similar logic. As these are independent, the final probability is $\dfrac{17}{19} \cdot \dfrac{4}{5} = \dfrac{68}{95}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "68/95"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "USmVUuBAwbFnSP21E4FG",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:59:40 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 796385,
    "source": "MAO",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Multiple Divisors II",
    "topic": "probability",
    "urlEnding": "multiple-divisors-ii"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "USmVUuBAwbFnSP21E4FG",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Multiple Divisors II",
    "topic": "probability",
    "urlEnding": "multiple-divisors-ii"
  }
}
```
