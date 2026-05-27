# QuantGuide Question

## 1142. The Arithmetical Cabby

**Metadata**

- ID: `C3AW7e6h0A6Srv2nGofh`
- URL: https://www.quantguide.io/questions/the-arithmetical-cabby
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: Puzzles_and_Curious_Problems
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-1 09:51:10 America/New_York
- Last Edited By: Gabe

### 题干

The driver of the taxi-cab was wanting in civility, so Mr. Wilkins asked him for his number.
"You want my number, do you?" said the driver.
"Well, work it out for yourself.
If you divide by number by $2,3,4,5,6$, you will find there is always $1$ over, but if you divide it by $11$, there ain't no remainder.  What's more, there's no other driver with a lower number who can say the same."
What was the fellow's number?

### Hint

Consider $n - 1$ instead of $n$. What properties of $n-1$ do we have? 

### 解答

Let $n$ be the driver's number. We know that $n-1$ is divisible by $2,3,4,5,6$. Hence, we know that $n - 1 = k * \text{lcm}(2,3,4,5,6) = 60k$, where $k$ is an integer.

$$\\$$

If $k = 0$, we get $n = 1$, which is not divisible by $11$. Similarly, $k = 1$ yields $n = 61$ which is also not divisible by $11$. Finally, $k = 2$ yields $n = 121$, which is divisible by $11$. Hence, this is our result. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "121"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "C3AW7e6h0A6Srv2nGofh",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-1 09:51:10 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9422093,
    "source": "Puzzles_and_Curious_Problems",
    "status": "published",
    "tags": [],
    "title": "The Arithmetical Cabby",
    "topic": "brainteasers",
    "urlEnding": "the-arithmetical-cabby",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "C3AW7e6h0A6Srv2nGofh",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "The Arithmetical Cabby",
    "topic": "brainteasers",
    "urlEnding": "the-arithmetical-cabby"
  }
}
```
