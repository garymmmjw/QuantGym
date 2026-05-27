# QuantGuide Question

## 212. Dividing Nuggets

**Metadata**

- ID: `HGcYIxKYL2QmoLy8hGKY`
- URL: https://www.quantguide.io/questions/dividing-nuggets
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: andy
- Tags: Combinatorics, Conditional Probability
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 21:21:06 America/New_York
- Last Edited By: Gabe

### 题干

Mr. Garrison has four students in his elementary school math class: Eric, Stan, Kyle, and Kenny. While on a field trip, Mr. Garrison's class stops at a fast food restaurant for lunch. Mr. Garrison purchases $50$ chicken nuggets in bulk for his four students to share. Stan, Kyle, and Kenny each want at least $6$ nuggets, while Eric wants at least $18$ nuggets. Mr. Garrison randomly partitions the $50$ nuggets into four piles such that each partition has an equal chance of occurring. Each student has at least $5$ nuggets after the partition. The probability that Mr. Garrison's students are all satisfied can be expressed in the form  \[\begin{aligned} \frac{\binom{a}{b}}{\binom{c}{d}}  \end{aligned}\] Find min($a + 2b + c + 2d$).

### Hint

We wish to find $\mathbb{P}(A | B)$, where $A$ is the event that all four students are satisfied, and $B$ is the event that Mr. Garrison's division of the nuggets gives each student at least $5$. How can we use the Stars and Bars approach to solve this problem?

### 解答

We wish to find $\mathbb{P}(A | B)$, where $A$ is the event that all four students are satisfied, and $B$ is the event that Mr. Garrison's division of the nuggets gives each student at least $5$. First, note the following:  \[\begin{aligned}     \mathbb{P}(A | B) &= \frac{\mathbb{P}(A \cap B)}{\mathbb{P}(B)} \\     &= \frac{\mathbb{P}(A)}{\mathbb{P}(B)} \end{aligned}\] Since the sample space $\Omega$ is the same for the probabilities in the numerator and the denominator, and since we are told that each partition has an equal chance of occurring, our problem can be simplified into the following two sub-problems: (1) how many ways can $50$ nuggets be divided into four distinguishable groups so that there are at least $6$ nuggets in the first three groups and at least $18$ nuggets in the fourth group, and (2) how many ways can $50$ nuggets be divided into four distinguishable groups so that there are at least $5$ nuggets in each group.  $$$$  Let's begin with the first sub-problem. We can utilize stars and bars. Since we have $50$ total nuggets and $4$ buckets, we end up with $3$ bars. Let's assign $6$ nuggets into each of the first three groups and $18$ nuggets into the fourth group. This leaves us with $50 - 3 \cdot 6 - 18 = 14$ nuggets left to split into groups. There are $\binom{17}{3}$ ways to order our $14$ stars and $3$ bars.  $$$$  Similarly, for the second sub-problem, we can assign $5$ nuggets into each of the four groups. This leaves us with $30$ chicken nuggets (stars) left to be partitioned. There are $\binom{33}{3}$ ways to order our $30$ stars and $3$ bars.  $$$$  Our answer is: \[\begin{aligned}     \frac{\binom{17}{3}}{\binom{33}{3}} \end{aligned}\] Finally, $17 + 2\cdot 3 + 33 + 2 \cdot 3 = 62$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "62"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "HGcYIxKYL2QmoLy8hGKY",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:21:06 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1666084,
    "source": "andy",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Dividing Nuggets",
    "topic": "probability",
    "urlEnding": "dividing-nuggets",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "HGcYIxKYL2QmoLy8hGKY",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Dividing Nuggets",
    "topic": "probability",
    "urlEnding": "dividing-nuggets"
  }
}
```
