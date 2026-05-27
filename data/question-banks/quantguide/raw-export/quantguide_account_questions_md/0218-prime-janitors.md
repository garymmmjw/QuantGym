# QuantGuide Question

## 218. Prime Janitors

**Metadata**

- ID: `BkzyXBl3jNfhye6lZGec`
- URL: https://www.quantguide.io/questions/prime-janitors
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 3
- Companies: SIG
- Source: modified classic question, original
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-30 09:43:33 America/New_York
- Last Edited By: Gabe

### 题干

Janitors at a large trading company come to work to see $100$ open doors. These doors are labeled $1$ to $100$. Throughout the day, janitors open/close doors based off of their number. The first janitor closes every door that's a multiple of $2$. Then the next janitor closes every door that's a multiple of $3$ unless its currently closed, in which case he opens it back up. This will continue with by having the $k$th janitor open/close all door numbers that are a multiple of the $k$th positive prime integer. How many doors are open at the end of the day?

### Hint

For a door to be closed at the end of the day, this means that it must have been touched an odd amount of times. What does this say about the number of distinct prime factors?

### 解答

Looking at this scenario a bit longer, you’ll see that the opening/closing of doors are dependent on their factors. For example, door $2$ starts opened and is closed by the first janitor. Door $3$ is going to be closed by the second janitor. However, door $6$ is closed by the first janitor, but reopened by the second janitor. In general, door $k$ will be closed at the end of the day if it has an odd number of distinct prime factors. This is all of the integers that are prime integers themselves, powers of prime integers (both have $1$ factor), or integers that have $3$ distinct prime factors. 


$$$$

The primes that are at most $100$ are: $2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97$ ($25$ integers)

$$$$

The powers of primes that are at most $100$ are: $4,8,16,32,64,9,27,81,25,49$ ($10$ integers)

$$$$

Integers that are at most $100$ with $3$ prime factors are: 

$$
\begin{align*}
2 \cdot 3 \cdot 5 = 30\\
2 \cdot 3 \cdot 7 = 42\\
2 \cdot 3 \cdot 11 = 66\\
2 \cdot 3 \cdot 13 = 78\\
2 \cdot 5 \cdot 7 = 70\\
2^2 \cdot 3 \cdot 5 = 60\\
2^2 \cdot 3 \cdot 7 = 84\\
2 \cdot 3^2 \cdot 5 = 90\\
\end{align*}
$$

There are $8$ integers above. This means that there are $25 + 10 + 8 = 43$ closed doors, meaning that $100 - 43 = 57$ are still open.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "57"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "BkzyXBl3jNfhye6lZGec",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 09:43:33 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1745489,
    "source": "modified classic question, original",
    "status": "published",
    "tags": [],
    "title": "Prime Janitors",
    "topic": "brainteasers",
    "urlEnding": "prime-janitors",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "hard",
    "id": "BkzyXBl3jNfhye6lZGec",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Prime Janitors",
    "topic": "brainteasers",
    "urlEnding": "prime-janitors"
  }
}
```
