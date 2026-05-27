# QuantGuide Question

## 116. Prime Subset

**Metadata**

- ID: `L0TqJwayFwQguxCuDcXE`
- URL: https://www.quantguide.io/questions/prime-subset
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Jane Street
- Source: js glassdoor
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-4 18:11:00 America/New_York
- Last Edited By: Gabe

### 题干

Consider all subsets of $S =  \{1,2,3,\dots,30\}$ so that each pair of numbers in that subset are coprime. Find the subset $\Omega \subseteq S$ satisfying the previous condition whose elements have the largest sum. What is the sum of all the elements in $\Omega$?

### Hint

To ensure all of the elements are coprime, the easiest way to make a candidate set would be the collection of all prime numbers at most $30$. However, we also want to include $1$, as $1$ is coprime to every positive integer. Therefore, a candidate set would be $$\{1,2,3,5,7,11,13,17,19,23,29\}$$ This set has sum $130$. Can you do better by combining and substituting different values?

### 解答

To ensure all of the elements are coprime, the easiest way to make a candidate set would be the collection of all prime numbers at most $30$. However, we also want to include $1$, as $1$ is coprime to every positive integer. Therefore, a candidate set would be $$\{1,2,3,5,7,11,13,17,19,23,29\}$$ This set has sum $130$. However, we can do better than this by noting that we could replace any prime integers in the set by a combination of their factors that would have a larger sum. For example, you may remove $3$ and $5$ to replace it with $15$, increasing the sum to $137$. The question then becomes which integers can we do this for and not violate our condition. Let's start with taking out the $2$. This is natural since $2$ is our smallest integer besides $1$ in our subset. The closest we can get to $30$ with elements currently in the subset is $28$, as $2^2 \cdot 7 = 28$. $29$ is already in our subset, and $30$ can't be added in presently, as $3$ and $5$ divide $30$. Therefore, we should replace $2$ and $7$ with $28$, increasing our sum by $19$ to $149$. Our remaining set is $$\{1,3,5,11,13,17,19,23,28,29\}$$ Afterwards, we note that $3^3 = 27$, and $27$ is still coprime to everything our in our set. Similarly, $5^2 = 25$ would also be coprime to everything else, so we make these substitutions as well. This yields our final set of $$\Omega = \{1,11,13,17,19,23,25,27,28,29\}$$ The elements of this set sum to $193$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "193"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "L0TqJwayFwQguxCuDcXE",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-4 18:11:00 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 809067,
    "source": "js glassdoor",
    "status": "published",
    "tags": [],
    "title": "Prime Subset",
    "topic": "brainteasers",
    "urlEnding": "prime-subset",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "hard",
    "id": "L0TqJwayFwQguxCuDcXE",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Prime Subset",
    "topic": "brainteasers",
    "urlEnding": "prime-subset"
  }
}
```
