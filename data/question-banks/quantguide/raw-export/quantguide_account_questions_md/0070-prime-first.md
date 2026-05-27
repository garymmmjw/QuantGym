# QuantGuide Question

## 70. Prime First

**Metadata**

- ID: `1OuOQCoeAA39ersz5ir5`
- URL: https://www.quantguide.io/questions/prime-first
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Jane Street
- Source: js andy
- Tags: Games
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-19 21:01:24 America/New_York
- Last Edited By: Gabe

### 题干

Consider the set of integers $S =\{2,3,\dots,30\}$. Alice and Bob play a game where they take turns selecting integers from $S$. The first player to select an integer that shares a common factor with a previously picked integer loses. Alice has the ability to determine if she wants to select first or second. Assume both players play optimally. Let $p = 1$ if Alice should choose to go first and $p = 2$ if she should go second. There are $6$ optimal selections $v_1,\dots,v_5$ for Alice's first turn. Find $100p + \dfrac{v_1 + v_2 + v_3 + v_4 + v_5 + v_6}{6}$.

### Hint

Consider all the primes in $S: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29$. There are $10$ such integers. If you eliminate $2$ prime factors on the first turn, what happens? 

### 解答

Consider all the primes in $S: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29$. There are $10$ such integers. The key idea to notice here is that for whoever selects the integer $6$, that eliminates $2$ and $3$. Therefore, no other pairwise products of primes among the remaining prime integers are at most $30$. Therefore, there would be $8$ primes left, and whoever is selecting first in this new game loses, as they can only eliminate one prime factor a turn. However, this "new game" is really just the second turn our game after we eliminate $2$ and $3$. Therefore, Alice should go first, select the value $6$ (alternatively, $12, 18,$ or $24$ also work, as they have the same primes in the  factorization) so that she can eliminate both $2$ and $3$, and then Bob and Alice alternate selecting among the remaining prime integers. Then, Bob would be forced to pick some non-prime integer, which will have a prime factor among those already eliminated, so Bob will lose. Therefore, Alice should go first, and the answer is $1$.

$$$$

However, there is also another sneaky starting integer, which is $5$. This is because regardless of what Bob selects on his first turn after Alice selects $5$, Alice can force Bob to eliminate one prime factor at a time after her next turn, so this also works. Since $5$ works, $5^2 = 25$ also works. Therefore, $$100(1) + \dfrac{6 + 12 + 18 + 24 + 5 + 25}{6} = 115$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "115"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "1OuOQCoeAA39ersz5ir5",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-19 21:01:24 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 485464,
    "source": "js andy",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Prime First",
    "topic": "brainteasers",
    "urlEnding": "prime-first",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "hard",
    "id": "1OuOQCoeAA39ersz5ir5",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Prime First",
    "topic": "brainteasers",
    "urlEnding": "prime-first"
  }
}
```
