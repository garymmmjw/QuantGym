# QuantGuide Question

## 563. Multiple Divisors I

**Metadata**

- ID: `OXqGhEAc9GP6Z7STemr9`
- URL: https://www.quantguide.io/questions/multiple-divisors-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Events
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Find the probability that a randomly selected integer from the set of positive divisors of $10^{99}$ is divisible by $10^{80}$.

### Hint

Consider the prime factorization of $10^{99}$. How many divisors are there?

### 解答

The prime factorization of $10^{99}$ is $2^{99} \cdot 5^{99} = (2^{80} \cdot 5^{80}) \cdot 2^{19} \cdot 5^{19}$. The term in parentheses is $10^{80}$. As we know that there are $100$ options of exponent for our divisor for each of $2$ and $5$ (can choose an exponent between $0$ and $99$, inclusive of both), there must be $100^2 = 10000$ divisors total that we can select from. Of those, we need those with the exponent for both $2$ and $5$ to be at least $80$. By the previous rewriting of our expression, this just means that we must choose an exponent for both $2$ and $5$ that are between $80$ and $99$, inclusive of both. This gives us $20$ options for each, implying that there are $20^2 = 400$ total divisors satisfying this. Putting it all together, our probability must therefore be $\dfrac{400}{10000} = \dfrac{1}{25}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/25",
      "0.04"
    ],
    "difficulty": "easy",
    "id": "OXqGhEAc9GP6Z7STemr9",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 4519751,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Multiple Divisors I",
    "topic": "probability",
    "urlEnding": "multiple-divisors-i"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "OXqGhEAc9GP6Z7STemr9",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Multiple Divisors I",
    "topic": "probability",
    "urlEnding": "multiple-divisors-i"
  }
}
```
