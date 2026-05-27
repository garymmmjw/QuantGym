# QuantGuide Question

## 240. Student Appointment

**Metadata**

- ID: `ovYpZEhR5EqSWeSXOoja`
- URL: https://www.quantguide.io/questions/student-appointment
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: IMC
- Source: IMC
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 22:45:00 America/New_York
- Last Edited By: Gabe

### 题干

You have $5$ students that you want to see $3$ times each over the next month. There are $15$ time slots available for the students to select from. However, one of the students can't attend in the first time slot. How many different ways can these students be scheduled?

### Hint

We can think of this as an anagrams problem. Label the students $1-5$. Each scheduling then corresponds to some anagram of $111222333444555$.

### 解答

We can think of this as an anagrams problem. Label the students $1-5$. Each scheduling then corresponds to some anagram of $111222333444555$. Say that student $1$ is the student unable to make the first time slot. There are $\displaystyle \binom{15}{3,3,3,3,3} = \dfrac{15!}{(3!)^5}$ total arrangements of these characters. However, we need to exclude those that start with $1$. The probability a given string starts with $1$ is $\dfrac{1}{5}$, as there are equal amounts of each of the $5$ numbers in the strong. Therefore, $\dfrac{4}{5}$ do not start with $1$. This means $\dfrac{4}{5}$ of all of the schedulings are valid, so our answer is $$\dfrac{4}{5} \cdot \dfrac{15!}{(3!)^5} = 134,534,400$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "134534400"
    ],
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "ovYpZEhR5EqSWeSXOoja",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 22:45:00 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1900371,
    "source": "IMC",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Student Appointment",
    "topic": "probability",
    "urlEnding": "student-appointment"
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "id": "ovYpZEhR5EqSWeSXOoja",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Student Appointment",
    "topic": "probability",
    "urlEnding": "student-appointment"
  }
}
```
