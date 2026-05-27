# QuantGuide Question

## 5. Free Sundae

**Metadata**

- ID: `qRPVQCF8H7ViHcv7Icck`
- URL: https://www.quantguide.io/questions/free-sundae
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Games, Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 22:15:46 America/New_York
- Last Edited By: Gabe

### 题干

You are in line at an ice cream shop when the manager announces that she will give a free sundae to the first person in line whose birthday is the same as someone who has already bought an ice cream. Assuming that you do not know anyone else's birthday and that all birthdays are uniformly distributed across the 365 days in a normal year, what position in line will you choose to maximize your probability of receiving the free sundae?

### Hint

Think of this as an optimization problem. How can you define the function you are trying to optimize?

### 解答

You choose to be the $n$-th person in line. In order for you to get the free sundae, all of the first $n-1$ people ahead of you must have different birthdays, and your birthday needs to be the same as one of these individuals. Thus, the probability that you receive the free sundae is $P(n) = \frac{365 \times 364 \times ... \times (365-n+2)}{365^{n-1}} \times \frac{n-1}{365}.$ You may feel free to find the derivative with respect to $n$ and solve for $n$. Another approach would be to notice that the $n$ that we are solving for must be such that $P(n) > P(n-1)$ and $P(n) > P(n+1)$; or in other words, the value of $n$ maximizes $P(n)$.   $$P(n-1) = \frac{365}{365} \times \frac{364}{365} \times ... \times \frac{365 - (n-3)}{365} \times \frac{n-2}{365}$$  $$P(n) = \frac{365}{365} \times \frac{364}{365} \times ... \times \frac{365 - (n-2)}{365} \times \frac{n-1}{365}$$  $$P(n+1) = \frac{365}{365} \times \frac{364}{365} \times ... \times \frac{365 - (n-1)}{365} \times \frac{n}{365}$$   Thus,  $$P(n) > P(n-1) \Rightarrow n^2 - 3n - 363 < 0$$  $$P(n) > P(n+1) \Rightarrow n^2 - n - 365 > 0$$   We find that the value of $n$ that satisfies these two inequalities is 20.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "20"
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "qRPVQCF8H7ViHcv7Icck",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 22:15:46 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 16,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Free Sundae",
    "topic": "probability",
    "urlEnding": "free-sundae",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "qRPVQCF8H7ViHcv7Icck",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Free Sundae",
    "topic": "probability",
    "urlEnding": "free-sundae"
  }
}
```
