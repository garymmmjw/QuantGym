# QuantGuide Question

## 253. Prime Pair

**Metadata**

- ID: `wKMr3UlFCP7xUvB2mkYk`
- URL: https://www.quantguide.io/questions/prime-pair
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Marshall Wace, SIG, Jane Street
- Source: mwgd
- Tags: Combinatorics, Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-30 18:42:48 America/New_York
- Last Edited By: Gabe

### 题干

You roll two fair $6-$sided dice. Each of the two dice have the first $6$ prime numbers on the sides. Find the probability that the sum of the two upfaces is also prime?

### Hint

The numbers on the sides would be $2,3,5,7,11,$ and $13$. Therefore, the sum of the two upfaces has to be between $4$ and $26$, inclusive. What must one of the dice show for the sum to be prime?

### 解答

The numbers on the sides would be $2,3,5,7,11,$ and $13$. Therefore, the sum of the two upfaces has to be between $4$ and $26$, inclusive. The prime integers in this interval are $5,7,11,13,17,19,$ and $23$. We now need to determine how each prime can be obtained from these dice. One thing to note is that $2$ must be one of the rolls, as all other values on the die are primes larger than $2$, which must be odd. Therefore, the outcomes are just primes $p$ such that $p-2$ is also a prime and $p-2 \leq 13$. The values of $p$ where this holds true is $p = 5,7,$ and $13$. Each of these have two permutations of the die outcomes that yield that sum. Therefore, $6$ such outcomes of the $6^2 = 36$ yield a prime sum, so our answer is $$\dfrac{6}{36} = \dfrac{1}{6}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/6"
    ],
    "companies": [
      {
        "company": "Marshall Wace"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "wKMr3UlFCP7xUvB2mkYk",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 18:42:48 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1989303,
    "source": "mwgd",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Prime Pair",
    "topic": "probability",
    "urlEnding": "prime-pair",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Marshall Wace"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "id": "wKMr3UlFCP7xUvB2mkYk",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Prime Pair",
    "topic": "probability",
    "urlEnding": "prime-pair"
  }
}
```
