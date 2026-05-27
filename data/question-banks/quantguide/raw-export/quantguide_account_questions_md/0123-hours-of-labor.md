# QuantGuide Question

## 123. Hours of Labor

**Metadata**

- ID: `wvIjcwfQZnnBjOcTDEDm`
- URL: https://www.quantguide.io/questions/hours-of-labor
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Millennium Management, Squarepoint Capital
- Source: Millenium OA, edited version and diff question
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: 5
- Last Edited: 2023-10-27 17:14:15 America/New_York
- Last Edited By: Gabe

### 题干

A factory wants to maximize the number of hours their employees are not working each year. If none of the employees has a birthday on a given day of the year, then every employee must come to work all $24$ hours that day. If at least one person has a birthday on a given day, then none of the employees need to work that day. This factory has good work-life balance, so they want to hire the number of people that would maximize the expected total number of hours that employees are NOT working each year. How many employees should the factory hire? If the answer is infinite, answer $-1$. 

### Hint

Let $Y_n$ be the number of hours that employees have off in a year when there are $n$ employees. Then $\mathbb{E}[Y_n] = 24n \mathbb{E}[T_n]$, where $T_n$ is the number of days that the employees have off in a year. To calculate $\mathbb{E}[T_n]$, let $X_1,X_2,\dots, X_n$ be the indicators of the event that the $i$th person, $1 \leq i \leq n$, has a distinct birthday distinct from the other $n-1$ people. Then $T_n = X_1 + \dots + X_n$ gives the total number of distinct birthdays in the year.

### 解答

Let $Y_n$ be the number of hours that employees have off in a year when there are $n$ employees. Then $\mathbb{E}[Y_n] = 24n \mathbb{E}[T_n]$, where $T_n$ is the number of days that the employees have off in a year. The $24n$ comes from the fact that there are $24$ hours in a day and that there are $n$ employees each spending that amount of time off. We can calculate $T_n$ by using indicators.
 
$$$$

Let $X_1,X_2,\dots, X_{365}$ be the indicators of the event that the $i$th day, $1 \leq i \leq 365$, has at least one of the $n$ people born on it. Then $T_n = X_1 + \dots + X_{365}$ gives the total days off in the year. Then $\mathbb{E}[T_n] = 365 \mathbb{E}[X_1]$ by linearity of expectation and the fact that each day is equally likely to have someone born on it. 

$$$$

$\mathbb{E}[X_1]$ is the probability that at least 1 person has a birthday on day $1$. The complement of this is that all $n$ people are both on the other $364$ days of the year. The probability all of them do is $\left(\dfrac{364}{365}\right)^{n}$. Therefore, $$\mathbb{E}[T_n] = 365\left(1 - \left(\dfrac{364}{365}\right)^{n}\right)$$

$$$$

This means that $\mathbb{E}[Y_n] = 24n \cdot 365 \cdot \left(1 - \left(\dfrac{364}{365}\right)^{n}\right)$ by substitution. As $n \rightarrow \infty$, the interior term tends to $1$, while the exterior goes to $\infty$. Therefore, the answer is infinite, meaning we enter $-1$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-1"
    ],
    "companies": [
      {
        "company": "Millennium Management"
      },
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "wvIjcwfQZnnBjOcTDEDm",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-27 17:14:15 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 858409,
    "source": "Millenium OA, edited version and diff question",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Hours of Labor",
    "topic": "probability",
    "urlEnding": "hours-of-labor",
    "version": 5
  },
  "list_summary": {
    "companies": [
      {
        "company": "Millennium Management"
      },
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "medium",
    "id": "wvIjcwfQZnnBjOcTDEDm",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Hours of Labor",
    "topic": "probability",
    "urlEnding": "hours-of-labor"
  }
}
```
